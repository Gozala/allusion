// @flow strict

import { idle } from "../Effect/scheduler.js"
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
import { mark } from "../reflex/Element.js"

/*::
import type { Node, Fragment } from "../prosemirror-model/src/index.js"
export type { Node, Fragment }
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

const parseTitle = (content /*:Fragment*/) /*:[Node, Fragment]*/ => {
  const node = content.firstChild
  if (node && node.type === schema.nodes.heading && node.attrs.level === 1) {
    return [
      schema.node("title", null, schema.text(node.textContent.slice(2))),
      content.cut(node.nodeSize)
    ]
  } else {
    return [schema.node("title"), content]
  }
}

const AUTHOR_PREFIX = "Author: "
const parseAuthor = (content /*:Fragment*/) /*:[Node, Fragment]*/ => {
  const node = content.firstChild
  if (
    node &&
    node.type === schema.nodes.paragraph &&
    node.nodeSize > AUTHOR_PREFIX.length &&
    node.textBetween(0, AUTHOR_PREFIX.length) === AUTHOR_PREFIX
  ) {
    return [
      schema.node("author", null, node.slice(AUTHOR_PREFIX.length).content),
      content.cut(node.nodeSize)
    ]
  } else {
    return [schema.node("author"), content]
  }
}

const toDocument = (root /*:Node*/) /*:Node*/ => {
  const [title, content] = parseTitle(root.content)
  const [author, body] = parseAuthor(content)
  const article = body.size === 0 ? schema.node("paragraph") : body
  return schema.node("doc", null, [
    schema.node("header", null, [title, author]),
    schema.node("article", null, article)
  ])
}

const emptyDocument /*:Node*/ = schema.node("doc", null, [
  schema.node("header", null, [schema.node("title"), schema.node("author")]),
  schema.node("article", null, schema.node("paragraph"))
])

const parseDocument = (text /*:string*/) /*:Node*/ => {
  const root = Parser.parse(text + `\n\n`)
  if (root instanceof Error) {
    return emptyDocument
  } else {
    return toDocument(root)
  }
}

/*::
export interface Document {
  +state:EditorState;
  +node:Node;
  +title:string;
  +author:string;
  +article:string;
  +markup:string;
}
*/

export const parse = (markup /*:string*/) => {
  const doc = markup === "" ? emptyDocument : parseDocument(markup)

  return new EditorDocument(
    EditorState.create({
      doc,
      schema,
      plugins: editorPlugins
    })
  )
}

class EditorDocument /*::implements Document*/ {
  /*::
  _node:Node
  _markup:?string
  _title:?string
  _author:?string
  _article:?string
  +state: EditorState
  */
  constructor(state /*:EditorState*/) {
    this.state = state
    this._markup = null
    this._title = null
    this._author = null
    this._article = null
  }
  get node() {
    return this.state.doc
  }
  get markup() {
    const { _markup } = this
    if (_markup) {
      return _markup
    } else {
      const markup = Serializer.serialize(this.node)
      this._markup = markup
      return markup
    }
  }
  get title() {
    const { _title } = this
    if (_title != null) {
      return _title
    } else {
      const { markup } = this
      const title = markup.substring(2, markup.indexOf("\n"))
      this._title = title
      return title
    }
  }
  get author() {
    const { _author } = this
    if (_author != null) {
      return _author
    } else {
      const { markup } = this
      const offset = markup.indexOf("\n") + 2
      const line = markup.substring(offset, markup.indexOf("\n", offset))
      if (line.startsWith(AUTHOR_PREFIX)) {
        const author = line.slice(AUTHOR_PREFIX.length)
        this._author = author
        return author
      } else {
        return ""
      }
    }
  }
  get article() {
    const { author, title, markup } = this
    let offset = 2 + title.length + 2
    if (author.length > 0) {
      return markup.slice(offset + AUTHOR_PREFIX.length + author.length + 2)
    } else {
      return markup.slice(offset)
    }
  }
}

export default class Editor extends HTMLElement {
  /*::
  root:ShadowRoot
  editor:EditorView
  initState:?EditorState
  */
  constructor() {
    super()
    this.root = this.attachShadow({ mode: "open", delegatesFocus: true })
  }

  get document() {
    const { editor } = this
    if (editor) {
      return new EditorDocument(editor.state)
    } else {
      return null
    }
  }
  set document(document /*:Document*/) {
    if (this.editor && this.editor.state !== document.state) {
      this.editor.updateState(document.state)
    } else {
      this.initState = document.state
    }
  }
  onChange() {
    this.dispatchEvent(new CustomEvent("change"))
  }
  async connectedCallback() {
    const onChange = idle.debounce(() => this.onChange())
    this.root.appendChild(
      createStyleSheet(this.ownerDocument, "/css/editor.css")
    )
    this.root.appendChild(
      createStyleSheet(this.ownerDocument, "/src/codemirror/lib/codemirror.css")
    )

    const state =
      this.initState ||
      EditorState.create({
        doc: emptyDocument,
        schema,
        plugins: editorPlugins
      })

    this.initState = null
    const editor = new EditorView(this.root, {
      state,
      nodeViews: {
        expandedImage: Image.view()
      },
      dispatchTransaction(transaction) {
        const state = editor.state.apply(transaction)
        editor.updateState(state)
        onChange()
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
