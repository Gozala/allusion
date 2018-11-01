// @flow strict

import { EditorView } from "../prosemirror-view/src/index.js"
import { EditorState } from "../prosemirror-state/src/index.js"
import schema from "./Schema.js"
import { keymap } from "../prosemirror-keymap/src/keymap.js"
import { history } from "../prosemirror-history/src/history.js"
import { baseKeymap } from "../prosemirror-commands/src/commands.js"
import { Plugin } from "../prosemirror-state/src/index.js"
import { dropCursor } from "../prosemirror-dropcursor/src/dropcursor.js"
import { gapCursor } from "../prosemirror-gapcursor/src/index.js"
import * as Placeholder from "../prosemirror-allusion/Placeholder.js"
import * as Markedown from "../prosemirror-marked/Plugin.js"
import * as TabIndex from "../prosemirror-allusion/TabIndex.js"
import keyBindings from "./KeyBindings.js"
import CodeBlock from "../prosemirror-allusion/CodeBlock.js"
import Image from "../prosemirror-allusion/View/Image.js"
import Parser from "./Parser.js"
import Serializer from "./Serializer.js"

const editorPlugins = [
  keyBindings(schema),
  keymap(baseKeymap),
  dropCursor(),
  gapCursor(),
  history(),
  Placeholder.plugin(),
  CodeBlock.plugin(),
  TabIndex.plugin(),
  Markedown.plugin(Parser, Serializer)
]

export default class Editor extends HTMLElement {
  /*::
  root:ShadowRoot
  editor:EditorView
  state:EditorState
  */
  constructor() {
    super()
    this.root = this.attachShadow({ mode: "open", delegatesFocus: true })
  }
  get text() /*:string*/ {
    return Serializer.serialize(this.editor.state.doc)
  }
  set text(markdown /*:string*/) {
    const root = Parser.parse(markdown)
    if (root instanceof Error) {
      throw Error
    }
    let { content } = root
    let title
    let author
    let article

    // const doc = schema.topNodeType.createAndFill(null, content)

    {
      const node = content.firstChild
      if (
        node &&
        node.type === schema.nodes.heading &&
        node.attrs.level === 1
      ) {
        title = schema.node("title", null, node.content)
        content = content.cut(node.nodeSize)
        // node.attrs = {
        //   placeholder: "Title",
        //   label: "Title",
        //   role: "title",
        //   tabindex: 0,
        //   markup: node.attrs.markup,
        //   level: node.attrs.level,
        //   empty: node.attrs.empty
        // }
      }
    }

    {
      const node = content.firstChild
      if (node && node.type === schema.nodes.paragraph) {
        author = schema.node("author", null, node.content)
        content = content.cut(node.nodeSize)
        // node.attrs = {
        //   placeholder: "Your name",
        //   label: "Author",
        //   role: "address",
        //   tabindex: 0,
        //   markup: node.attrs.markup,
        //   level: node.attrs.level,
        //   empty: node.attrs.empty
        // }
      }
    }

    // {
    //   const node = content.firstChild
    //   if (node && node.type === schema.nodes.paragraph) {
    //     node.attrs = {
    //       placeholder: "",
    //       tabindex: 0,
    //       markup: node.attrs.markup,
    //       level: node.attrs.level,
    //       empty: node.attrs.empty
    //     }
    //   }
    // }

    // const author = content.childCount > 1 ? content.child(1) : null
    // const authorNode =
    //   author && author.type === Parser.schema.nodes.paragraph
    //     ? Parser.schema.node("author", null, author.content)
    //     : Parser.schema.node("author")
    const doc = schema.node("doc", null, [
      schema.node("header", null, [
        title || schema.node("title"),
        author || schema.node("author")
      ]),
      schema.node(
        "article",
        null,
        content.size === 0 ? schema.node("paragraph") : content
      )
    ])

    this.editor.updateState(EditorState.create({
      doc,
      schema,
      plugins: editorPlugins
    }))
  }
  async connectedCallback() {
    this.root.appendChild(createStyleSheet(this.ownerDocument, "/css/editor.css"))
    this.root.appendChild(createStyleSheet(this.ownerDocument, "/src/codemirror/lib/codemirror.css"))

    this.editor = new EditorView(this.root, {
      state: EditorState.create({
        schema,
        plugins: editorPlugins
      }),
      nodeViews: {
        expandedImage: Image.view()
      }
    })
    this.text = ""
  }
}

const createStyleSheet = (document, url) => {
  const link = document.createElement("link")
  link.href = url
  link.rel = "stylesheet"
  link.type = "text/css"
  return link
}
