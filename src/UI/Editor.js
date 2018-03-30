// @flow strict

import type { Mailbox } from "./Program"
import { EditorView } from "prosemirror-view"
import { EditorState, Transaction } from "prosemirror-state"
import match from "match.flow"
import "../../css/editor.css"
import "../../css/code.css"
import schema from "./Allusion/Schema"
import { keymap } from "prosemirror-keymap"
import { history } from "prosemirror-history"
import { baseKeymap } from "prosemirror-commands"
import { Plugin } from "prosemirror-state"
import { dropCursor } from "prosemirror-dropcursor"
import { gapCursor } from "prosemirror-gapcursor"
import { menuBar, type MenuItem } from "prosemirror-menu"
import * as Placeholder from "./ProseMirror/Placeholder"
import * as TabIndex from "./ProseMirror/TabIndex"
import keyBindings from "./Allusion/KeyBindings"
import CodeBlock from "./ProseMirror/CodeBlock"
import {
  editableRange,
  expandRange,
  collapseRange,
  updateRange,
  EditRange
} from "./ProseMirror/EditRange"
import { findMarkupRange } from "./ProseMirror/Marks"
import Parser from "./Allusion/Parser"
import Serializer from "./Allusion/Serializer"
import { createFrom } from "./ProseMirror/Node"

export class Model {
  state: EditorState
  editRange: EditRange
  edit(tr: Transaction) {
    this.state = this.state.apply(tr)
    return this
  }
  constructor(state: EditorState, range: EditRange) {
    this.state = state
    this.editRange = range
  }
  static edit(tr: Transaction, self: Model) {
    const state = self.state.apply(tr)
    const range = editableRange(state.selection)
    return new Model(state, range)
  }
}

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
  TabIndex.plugin()
]

export const init = () => parse("")

export const parse = (markdown: string) => {
  let content = Parser.parse(markdown).content
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

  const state = EditorState.create({
    doc,
    schema,
    plugins: editorPlugins
  })
  const range = EditRange.empty
  return new Model(state, range)
}

export const serialize = (state: Model): string =>
  Serializer.serialize(state.state.doc)

export const update = match({
  transaction(tr: Transaction, model: Model) {
    if (tr.docChanged) {
      return edit(model, tr)
    } else {
      return selectionChange(model, tr)
    }
  }
})

export const selectionChange = (state: Model, change: Transaction): Model => {
  const { editRange } = state
  const { selection, doc } = change

  // if (editRange.includesSelection(selection)) {
  //   return Model.setEditor(state, after)
  // } else {
  const range = editableRange(selection)
  let tr = change

  if (editRange.length > 0 && range.length === 0) {
    tr = collapseRange(tr, editRange)
  } else if (editRange.length === 0 && range.length > 0) {
    tr = expandRange(tr, range)
  } else if (editRange.includes(range)) {
    // If user selects segment with in the exanded strong mark and executes
    // em command we'll need to execute expandsion even though editRange will
    // include new range.
    tr = tr
  } else {
    // Need to do replace range that is further off in the document
    // so that other edit ranges won't get shifted.
    if (range.index > editRange.index) {
      tr = expandRange(tr, range)
      tr = collapseRange(tr, editRange)
    } else {
      tr = collapseRange(tr, editRange)
      tr = expandRange(tr, editableRange(tr.selection))
    }
  }

  return Model.edit(tr, state)
}

export const edit = (state: Model, tr: Transaction): Model => {
  const { selection } = tr

  if (!selection.empty) {
    return selectionChange(state, tr)
  }

  const { editRange } = state
  let change = tr
  let range = editableRange(selection)
  if (editRange.excludes(range)) {
    change = collapseRange(tr, editRange)
    range = editableRange(change.selection)
  }

  return Model.edit(updateRange(range, change), state)
}

export const receive = async (state: Model) => {
  return []
}

export const view = (mailbox: Mailbox<Message>) => {
  const display = {
    view: null,
    render(state: Model, dom: Document) {
      const { view } = this
      if (view) {
        view.updateState(state.state)
        return view.dom
      } else {
        const view = new EditorView(
          { mount: document.createElement("main") },
          {
            state: state.state,
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
