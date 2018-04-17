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
import {
  editableRange,
  expand,
  collapse,
  updateRange,
  EditRange
} from "./ProseMirror/EditRange"
import Parser from "./Allusion/Parser"
import Serializer from "./Allusion/Serializer"
import { createFrom } from "./ProseMirror/Node"
import panic from "panic.flow"

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
  TabIndex.plugin(),
  Markup.plugin()
]

export const init = () => parse("")

export const parse = (markdown: string) => {
  const root = Parser.parse(markdown)
  if (root instanceof Error) {
    return panic()
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

export const selectionChange = (model: Model, change: Transaction): Model => {
  const { state, editRange } = model
  if (true) {
    return new Model(state.apply(change), editRange)
  }

  const { selection, doc } = change
  const range = editableRange(selection)
  const index = selection.$cursor ? selection.from : -1

  const { start: lastStart, end: lastEnd } = editRange
  const { start: newStart, end: newEnd } = range

  let tr = change.setMeta("selectionBefore", state.selection)

  // First deal with the rear part that way ranges in the front will remain same
  // and will not require computing new ranges
  if (lastEnd < newEnd) {
    const start = Math.max(newStart, lastEnd)
    tr = expand(tr, start, newEnd)
    if (start === index) {
      tr = tr.setSelection(TextSelection.create(tr.doc, index))
    }
  }

  if (newEnd < lastEnd) {
    tr = collapse(tr, Math.max(lastStart, newEnd), lastEnd)
  }

  if (lastStart < newStart) {
    tr = collapse(tr, lastStart, Math.min(lastEnd, newStart))
  }

  if (newStart < lastStart) {
    tr = expand(tr, newStart, Math.min(newEnd, lastStart))
    if (newStart === index) {
      tr = tr.setSelection(TextSelection.create(tr.doc, index))
    }
  }

  return Model.edit(tr, model)
}

export const edit = (model: Model, tr: Transaction): Model => {
  const { selection } = tr
  if (true) {
    return Model.edit(tr, model)
  }

  if (!selection.empty) {
    return selectionChange(model, tr)
  }
  const { state, editRange } = model

  let change = tr
  let range = editableRange(selection)
  // Whenever change switch block of the edit range collapse of the former
  // edit range won't be handled by a `updateRange` function. For example
  // typeing `# Hi↵` would cause former edit block to be in h1 and new one
  // in a paragraph below it.
  // We workaround that specific issue here, but a proper solution should just
  // compare edit blocks instead of ranges here and collapse the old one.
  // Complication is that old block may no longer even exist in a new version
  // so proper fix is more envolved and would likely require storing block node
  // position in a `EditRange` etc.. But this is good enough for now as in
  // practice it seems to behave as expected.
  if (editRange.end < range.start) {
    change = collapse(tr, editRange.start, editRange.end)
    range = editableRange(change.selection)
  }

  return Model.edit(updateRange(range, change), model)
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
