// @flow

import type { Transaction, EditorState } from "prosemirror-state"
import type { DatArchive, DatURL } from "../DatArchive"
import Archive from "../DatArchive"
import * as Notebook from "./Notebook"
import Parser from "./Parser"
import Serializer from "./Serializer"

export interface Program<inn, model, out = empty, options = void> {
  init(options): model;
  update(model, inn): model;
  receive(model): Promise<inn[]>;
  send(model): Promise<out[]>;
}

export type Message =
  | { type: "error", error: Error }
  | { type: "notebook", notebook: Notebook.Message }
  | { type: "info", info: Info }
  | { type: "load", load: string }
  | { type: "loaded", loaded: Notebook.Document }
  | { type: "save", save: Transaction }
  | { type: "edit", edit: EditorState }

export type JSONModel = {}

export class Model {
  notebook: Notebook.Model
  editor: EditorState
  transaction: ?Transaction
  time: number
  constructor(
    notebook: Notebook.Model,
    editor: EditorState,
    transaction: ?Transaction,
    time: number
  ) {
    this.notebook = notebook
    this.editor = editor
    this.transaction = transaction
    this.time = time
  }

  static new(
    notebook: Notebook.Model,
    editor: EditorState,
    transaction: ?Transaction,
    time: number
  ) {
    return new Model(notebook, editor, transaction, time)
  }
  static load(self: Model, notebook: Notebook.Model) {
    return Model.setNotebook(self, notebook)
  }
  static save(self: Model, notebook: Notebook.Model, time: number) {
    return new Model(notebook, self.editor, null, time)
  }
  static setNotebook(self: Model, notebook: Notebook.Model) {
    return new Model(notebook, self.editor, null, self.time)
  }
  static setEditor(self: Model, editor: EditorState) {
    return new Model(self.notebook, editor, null, self.time)
  }
}

export const init = (state: EditorState): Model =>
  new Model(Notebook.unmount(), state, state.tr, state.time)

export const transact = (
  state: Model,
  tr: Transaction,
  last: EditorState,
  next: EditorState
): Message[] => {
  if (tr.docChanged && tr.time - state.time > 100) {
    return [{ type: "save", save: tr }]
  } else {
    return [{ type: "edit", edit: next }]
  }
}

export const update = (state: Model, message: Message): Model => {
  if (message.type !== "edit") {
    console.log(message, state)
  }
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
      return Model.new(notebook, self.editor, transaction, transaction.time)
    }
    case "save": {
      const content = Serializer.serialize(message.save.doc)
      return Model.save(
        state,
        Notebook.save(state.notebook, content),
        message.save.time
      )
    }
    case "edit": {
      return Model.setEditor(state, message.edit)
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

export const receive = async (state: Model): Promise<Message[]> => {
  try {
    if (state.notebook.status === "unmount") {
      return [{ type: "info", info: await readInfo() }]
    } else {
      const notebookMessages = await Notebook.receive(state.notebook)
      return notebookMessages.map(toNotebookMessage)
    }
  } catch (error) {
    return [{ type: "error", error }]
  }
}

export const send = async (state: Model): Promise<Transaction[]> => {
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
  const { content } = Parser.parse(document.content)
  // Parser seems to right trim content of the document. As a simple workaround
  // we check if last child is header and if so we add empty paragraph.
  if (content.lastChild.type.name === "header") {
    return content.addToEnd(Parser.schema.node("paragraph"))
  } else {
    return content
  }
}
