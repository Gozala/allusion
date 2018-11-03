// @flow strict

import { EditorView } from "../prosemirror-view/src/index.js"
import { EditorState } from "../prosemirror-state/src/index.js"
import { keymap } from "../prosemirror-keymap/src/keymap.js"
import { history } from "../prosemirror-history/src/history.js"
import { baseKeymap } from "../prosemirror-commands/src/commands.js"
import { Plugin } from "../prosemirror-state/src/index.js"
import { dropCursor } from "../prosemirror-dropcursor/src/dropcursor.js"
import { gapCursor } from "../prosemirror-gapcursor/src/index.js"
import * as Placeholder from "../prosemirror-allusion/Placeholder.js"
import * as Marked from "../prosemirror-marked/Plugin.js"
import * as TabIndex from "../prosemirror-allusion/TabIndex.js"
import keyBindings from "./KeyBindings.js"
import CodeBlock from "../prosemirror-allusion/CodeBlock.js"
import Image from "../prosemirror-allusion/View/Image.js"
import schema from "./Schema.js"
import InputRules from "./InputRules.js"
import Parser from "./Parser.js"
import Serializer from "./Serializer.js"

/*::
import type { Node, Fragment } from "../prosemirror-model/src/index.js"
*/

const editorPlugins = [
  InputRules(schema),
  keyBindings(schema),
  keymap(baseKeymap),
  dropCursor(),
  gapCursor(),
  history(),
  Placeholder.plugin(),
  CodeBlock.plugin(),
  TabIndex.plugin(),
  Marked.plugin(Parser, Serializer)
]

const parseTitle = (content/*:Fragment*/)/*:[Node, Fragment]*/ => {
  const node = content.firstChild
  if (node && node.type === schema.nodes.heading && node.attrs.level === 1) {
    return [schema.node("title", null, node.content), content.cut(node.nodeSize)]
  } else {
    return [schema.node("title"), content]
  }
}

const parseAuthor = (content/*:Fragment*/)/*:[Node, Fragment]*/ => {
  const node = content.firstChild
  if (node && node.type === schema.nodes.paragraph) {
    return [
      schema.node("author", null, node.content),
      content.cut(node.nodeSize)
    ]
  } else {
    return [schema.node("author"), content]
  }
}

const toDocument = (root/*:Node*/)/*:Node*/ => {
  const [title, content] = parseTitle(root.content)
  const [author, body] = parseAuthor(content)
  const article = content.size === 0 ? schema.node("paragraph") : content
  return schema.node("doc", null, [
    schema.node("header", null, [title, author]),
    schema.node("article", null, article)
  ])
}

const emptyDocument = ()/*:Node*/ =>
  schema.node("doc", null, [
    schema.node("header", null, [
      schema.node("title"),
      schema.node("author")
    ]),
    schema.node(
      "article",
      null,
      schema.node("paragraph")
    )
  ]) 

const parseDocument = (text/*:string*/)/*:Node*/ => {
  const root = Parser.parse(text + `\n\n`)
  if (root instanceof Error) {
    return emptyDocument()
  } else {
    return toDocument(root)
  }
}

export const fromText = (text/*:string*/="")/*:EditorState*/ => {
  const doc = text === "" ? emptyDocument() : parseDocument(text)
  return EditorState.create({ doc, schema, plugins: editorPlugins })
}

export const toText = (state/*:EditorState*/)/*:string*/ =>
  Serializer.serialize(state.doc)



export default class Editor extends HTMLElement {
  /*::
  root:ShadowRoot
  editor:EditorView
  state:EditorState
  initState:?EditorState
  */
  constructor() {
    super()
    this.root = this.attachShadow({ mode: "open", delegatesFocus: true })
  }

  get state() {
    const { editor } = this
    return editor ? editor.state : null
  }
  set state(state/*:EditorState*/) {
    const { editor } = this
    if (editor) {
      editor.updateState(state)
    } else {
      this.initState = state
    }
  }

  get text() /*:string*/ {
    return toText(this.editor.state)
  }
  set text(text /*:string*/) {
    this.editor.updateState(fromText(text))
  }
  async connectedCallback() {
    const self = this
    this.root.appendChild(createStyleSheet(this.ownerDocument, "/css/editor.css"))
    this.root.appendChild(createStyleSheet(this.ownerDocument, "/src/codemirror/lib/codemirror.css"))
    const state = this.initState || fromText()
    this.initState = null
    const editor = new EditorView(this.root, {
      state,
      nodeViews: {
        expandedImage: Image.view()
      },
      dispatchTransaction(transaction) {
        const state = editor.state.apply(transaction)
        self.dispatchEvent(new CustomEvent("change", { detail: state }))
      }
    })
    this.editor = editor
  }
}

const createStyleSheet = (document, url) => {
  const link = document.createElement("link")
  link.href = url
  link.rel = "stylesheet"
  link.type = "text/css"
  return link
}
