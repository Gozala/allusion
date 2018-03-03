// @flow strict

import type { Transaction, EditorState, Mappping } from "prosemirror-state"
import { Decoration, DecorationSet } from "prosemirror-view"
import type { DatArchive, DatURL } from "../DatArchive"
import Archive from "../DatArchive"
import { Selection } from "prosemirror-state"
import * as Notebook from "./Notebook"
import Parser from "./Parser"
import Serializer from "./Serializer"
import {
  editableRange,
  beginEdit,
  endEdit,
  editOffRange,
  Range
} from "../ProseMirror/EditRange"

export interface Program<inn, model, out = empty, options = void> {
  init(options): model;
  decorations(model): DecorationSet;
  update(model, inn): model;
  receive(model): Promise<inn[]>;
  send(model): out[];
}

type Meta = { type: "noop" } | { type: "syntaxInput" }

type Edit = {
  transaction: Transaction,
  before: EditorState,
  after: EditorState,
  meta: Meta
}

export type Message =
  | { type: "error", error: Error }
  | { type: "notebook", notebook: Notebook.Message }
  | { type: "info", info: Info }
  | { type: "load", load: string }
  | { type: "loaded", loaded: Notebook.Document }
  | { type: "save" }
  | { type: "edit", edit: Edit }
  | { type: "selectionChange", change: Edit }

export type JSONModel = {}

class EditRange extends Range {
  decorations: DecorationSet
  doc: Node
  constructor(index: number, length: number, decorations: DecorationSet) {
    super(index, length)
    this.decorations = decorations
  }
  static empty: EditRange = new EditRange(Infinity, 0, DecorationSet.empty)
  static options = { nodeName: "u" }
  static new(index: number, length: number, doc: Node) {
    if (length === 0) {
      return EditRange.empty
    } else {
      const decoration = Decoration.inline(
        index,
        index + length,
        EditRange.options
      )
      return new EditRange(
        index,
        length,
        DecorationSet.create(doc, [decoration])
      )
    }
  }
  map(mapping: Mappping, doc: Node) {
    if (this.length === 0) {
      return this
    } else {
      const decorations = this.decorations.map(mapping, doc)
      const decoration = decorations.find()[0]
      if (!decoration) {
        return EditRange.empty
      } else {
        const { from, to } = decoration
        const length = to - from
        if (this.index !== from || this.length !== length) {
          return new EditRange(from, length, decorations)
        } else {
          return this
        }
      }
    }
  }
  patch({ index, length }: Range, doc: Node) {
    if (length === 0) {
      return EditRange.empty
    } else if (this.index === index && this.length === length) {
      return this
    } else {
      return EditRange.new(index, length, doc)
    }
  }
  includesSelection({ from, to }: Selection): boolean {
    const { index, length } = this
    return from >= index && index + length >= to
  }
  includes({ index, length }: Range): boolean {
    if (length === 0) {
      return true
    } else if (this.length === 0) {
      return false
    } else {
      return index >= this.index && this.index + this.length >= index + length
    }
  }
}

export class Model {
  notebook: Notebook.Model
  editor: EditorState
  transaction: ?Transaction
  editRange: EditRange
  cursorActivityTime: number
  constructor(
    notebook: Notebook.Model,
    editor: EditorState,
    transaction: ?Transaction,
    editRange: EditRange,
    cursorActivityTime: number
  ) {
    this.notebook = notebook
    this.editor = editor
    this.transaction = transaction
    this.editRange = editRange
    this.cursorActivityTime = cursorActivityTime
  }

  static new(
    notebook: Notebook.Model,
    editor: EditorState,
    transaction: ?Transaction,
    editRange: EditRange,
    cursorActivityTime: number
  ) {
    return new Model(
      notebook,
      editor,
      transaction,
      editRange,
      cursorActivityTime
    )
  }
  static load(self: Model, notebook: Notebook.Model) {
    return Model.setNotebook(self, notebook)
  }
  static loaded(self: Model, notebook: Notebook.Model, tr: Transaction) {
    return new Model(
      notebook,
      self.editor,
      tr,
      self.editRange,
      self.cursorActivityTime
    )
  }
  static setNotebook(self: Model, notebook: Notebook.Model) {
    return new Model(
      notebook,
      self.editor,
      null,
      self.editRange,
      self.cursorActivityTime
    )
  }
  static setEditor(self: Model, editor: EditorState) {
    return new Model(
      self.notebook,
      editor,
      null,
      self.editRange,
      editor.tr.time
    )
  }
}

export const init = (editor: EditorState): Model =>
  new Model(
    Notebook.unmount(),
    editor,
    editor.tr,
    EditRange.empty,
    editor.tr.time
  )

export const decorations = (
  state: Model //DecorationSet.empty
) => state.editRange.decorations

export const transact = (
  state: Model,
  edit: {
    transaction: Transaction,
    before: EditorState,
    after: EditorState,
    meta: Meta
  }
): Message[] => {
  if (edit.transaction.docChanged) {
    return [{ type: "edit", edit }]
  } else {
    return [{ type: "selectionChange", change: edit }]
  }
}

export const update = (state: Model, message: Message): Model => {
  switch (message.type) {
    case "info": {
      return Model.setNotebook(state, Notebook.init(message.info))
    }
    case "error": {
      console.error(message.error)
      return state
    }
    case "load": {
      const notebook = state.notebook
      const path = message.load.split("/")
      return Model.setNotebook(state, Notebook.open(notebook, path))
    }
    case "loaded": {
      const document = message.loaded
      const content = parseDocument(document)

      const transaction = state.editor.tr.replaceWith(
        0,
        state.editor.tr.doc.content.size,
        content
      )
      const notebook = Notebook.update(state.notebook, message)
      return Model.loaded(state, notebook, transaction)
    }
    case "save": {
      const content = Serializer.serialize(state.editor.doc)
      return Model.setNotebook(state, Notebook.save(state.notebook, content))
    }
    case "edit": {
      return edit(state, message.edit)
    }
    case "selectionChange": {
      return selectionChange(state, message.change)
    }
    case "notebook": {
      return Model.setNotebook(
        state,
        Notebook.update(state.notebook, message.notebook)
      )
    }
    default: {
      throw Error(`Unexpected message: ${JSON.stringify(message)}`)
    }
  }
}

export const edit = (state: Model, edit: Edit): Model => {
  const { after, transaction, meta } = edit
  const { schema } = after

  const { selection, doc } = transaction
  const range = state.editRange.map(transaction.mapping, transaction.doc)
  return Model.new(state.notebook, after, null, range, transaction.time)
}

export const selectionChange = (state: Model, change: Edit): Model => {
  const { editRange } = state
  const { after, transaction, meta } = change
  const { schema } = after
  const { selection, doc } = transaction

  if (editRange.includesSelection(selection)) {
    return Model.setEditor(state, after)
  } else {
    const range = editableRange(selection)

    let tr = after.tr
    if (editRange.length > 0 && range.length === 0) {
      tr = endEdit(tr, editRange, schema)
    } else if (editRange.length === 0 && range.length > 0) {
      tr = beginEdit(tr, range, schema)
    } else if (editRange.includes(range)) {
      tr = null
    } else {
      // Need to do replace range that is further off in the document
      // so that other edit ranges won't get shifted.
      if (range.index + range.length > editRange.index + editRange.length) {
        tr = beginEdit(tr, range, schema)
        tr = endEdit(tr, editRange, schema)
      } else {
        tr = endEdit(tr, editRange, schema)
        tr = beginEdit(tr, range, schema)
      }
    }

    return Model.new(
      state.notebook,
      after,
      tr,
      editRange.patch(range, doc),
      transaction.time
    )
  }
}

export const receive = async (state: Model): Promise<Message[]> => {
  if (state.notebook.status === "unmount" && !state.notebook.select) {
    return [{ type: "info", info: await readInfo() }]
  } else {
    const { notebook, editor } = state
    if (notebook.status !== "unmount") {
      const { document } = notebook
      if (editor.tr.time - document.time > 100) {
        // return [{ type: "save" }]
      }
    }

    const notebookMessages = await Notebook.receive(state.notebook)
    return notebookMessages.map(toNotebookMessage)
  }
}

export const send = (state: Model): Transaction[] => {
  return state.transaction ? [state.transaction] : []
}

const toNotebookMessage = (message: Notebook.Message): Message => {
  switch (message.type) {
    case "loaded":
      return message
    default:
      return { type: "notebook", notebook: message }
  }
}

export class Info {
  name: ?string
  path: string[]
  time: number
  constructor(name: ?string, path: string[], time: number) {
    this.name = name
    this.path = path
    this.time = time
  }
}

const readInfo = async (): Promise<Info> => {
  const { host, protocol, pathname } = window.location
  const [root, key, ...path] = decodeURI(pathname).split("/")
  if (key != "") {
    return new Info(key, path, Date.now())
  } else {
    const { notebookName, documentPath } = window.localStorage
    if (notebookName != null) {
      const path = documentPath ? documentPath.split("/") : []

      return new Info(notebookName, path, Date.now())
    } else {
      return new Info(null, [], Date.now())
    }
  }
}

const parseDocument = (document: Notebook.Document) => {
  const node = Parser.parse(document.content)
  const { content } = node
  console.log(node)
  // Parser seems to right trim content of the document. As a simple workaround
  // we check if last child is header and if so we add empty paragraph.
  if (content.lastChild && content.lastChild.type.name === "header") {
    return (content: any).addToEnd(Parser.schema.node("paragraph"))
  } else {
    return content
  }
}
