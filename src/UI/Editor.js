// @flow strict

import type { Mailbox } from "./Program"
import { EditorView } from "prosemirror-view"
import { EditorState, Transaction, TextSelection } from "prosemirror-state"
import match from "match.flow"
import "../../css/editor.css"
import schema from "./Allusion/Schema"
import { keymap } from "prosemirror-keymap"
import { history } from "prosemirror-history"
import { baseKeymap } from "prosemirror-commands"
import { Plugin } from "prosemirror-state"
import { dropCursor } from "prosemirror-dropcursor"
import { gapCursor } from "prosemirror-gapcursor"
import { menuBar, type MenuItem } from "prosemirror-menu"
import * as Placeholder from "./ProseMirror/Placeholder"
import * as Markup from "./ProseMirror/Markup"
import * as TabIndex from "./ProseMirror/TabIndex"
import keyBindings from "./Allusion/KeyBindings"
import CodeBlock from "./ProseMirror/CodeBlock"
import Image from "./ProseMirror/View/Image"
import { updateRange } from "./ProseMirror/EditRange"
import Parser from "./Allusion/Parser"
import Serializer from "./Allusion/Serializer"
import { createFrom } from "./ProseMirror/Node"
import panic from "panic.flow"

export type Model = EditorState

export type Message = { transaction: Transaction }

const editorPlugins = [
  //   Allusion(),
  keyBindings(schema),
  keymap(baseKeymap),
  dropCursor(),
  gapCursor(),
  history(),
  Placeholder.plugin(),
  CodeBlock.plugin(),
  TabIndex.plugin(),
  Markup.plugin()
]

export const init = () => parse("")

export const parse = (markdown: string) => {
  const root = Parser.parse(markdown)
  if (root instanceof Error) {
    return panic(root.message)
  }
  let { content } = root
  let title
  let author
  let article

  // const doc = schema.topNodeType.createAndFill(null, content)

  {
    const node = content.firstChild
    if (node && node.type === schema.nodes.heading && node.attrs.level === 1) {
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

  return EditorState.create({
    doc,
    schema,
    plugins: editorPlugins
  })
}

export const serialize = (state: Model): string =>
  Serializer.serialize(state.doc)

export const update = match({
  transaction(tr: Transaction, state: Model) {
    return state.apply(tr)
  }
})

export const receive = async (state: Model) => {
  return []
}

export const view = (mailbox: Mailbox<Message>) => {
  const display = {
    view: null,
    render(state: Model, dom: Document) {
      const { view } = this
      if (view) {
        view.updateState(state)
        return view.dom
      } else {
        const view = new EditorView(
          { mount: document.createElement("main") },
          {
            state: state,
            nodeViews: {
              expandedImage: Image.view()
            },
            dispatchTransaction(tr: Transaction) {
              mailbox.send({ transaction: tr })
            }
          }
        )
        this.view = view
        setTimeout(() => view.focus())

        return view.dom
      }
    }
  }
  return display
}
