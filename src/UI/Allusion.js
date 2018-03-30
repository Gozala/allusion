// @flow strict

import type { Transaction, EditorState } from "prosemirror-state"
import type { DatArchive, DatURL } from "./DatArchive"
import { Selection } from "prosemirror-state"
import Archive from "./DatArchive"
import * as Notebook from "./Allusion/Notebook"
import match from "match.flow"
import type { Mailbox } from "./Program"

export class Model {
  notebook: ?Notebook.Model
  constructor(notebook: ?Notebook.Model) {
    this.notebook = notebook
  }

  static new(notebook: Notebook.Model) {
    return new Model(notebook)
  }
  static load(self: Model, notebook: Notebook.Model) {
    return Model.setNotebook(self, notebook)
  }
  static loaded(self: Model, notebook: Notebook.Model, tr: Transaction) {
    return new Model(notebook)
  }
  static setNotebook(self: Model, notebook: Notebook.Model) {
    return new Model(notebook)
  }
}

export const init = (): Model => new Model(null)

export const update = match({
  info({ name, path }: Info, state: Model) {
    const notebook = name ? Notebook.open(name, path) : Notebook.draft()
    return Model.setNotebook(state, notebook)
  },
  notebook(message: Notebook.Message, state: Model) {
    return Model.setNotebook(state, Notebook.update(message, state.notebook))
  }
  // load(load: string, state: Model) {
  //   const notebook = state.notebook
  //   const path = load.split("/")
  //   return Model.setNotebook(state, Notebook.open(notebook, path))
  // },
  // loaded(source: string, state: Model) {
  //   const content = parseDocument(source)
  //   return Model.setNotebook(state, Notebook.update(state.notebook, content))
  // },
  // save(_, state) {
  //   const content = Serializer.serialize(state.editor.doc)
  //   return Model.setNotebook(state, Notebook.save(state.notebook, content))
  // }
})

type Message = { info: Info } | { notebook: Notebook.Message }

export const receive = async (state: Model): Promise<Message[]> => {
  const { notebook } = state
  if (notebook == null) {
    const info = await readInfo()
    return [{ info }]
  } else {
    const messages = await Notebook.receive(notebook)
    return messages.map(notebook => ({ notebook }))
  }
}

const readInfo = async (): Promise<Info> => {
  const { host, protocol, pathname } = window.location
  const [root, key, ...path] = decodeURI(pathname).split("/")
  if (key != "") {
    return new Info(key, path)
  } else {
    const { notebookName, documentPath } = window.localStorage
    if (notebookName != null) {
      const path = documentPath ? documentPath.split("/") : []

      return new Info(notebookName, path)
    } else {
      return new Info(null, [])
    }
  }
}

export class Info {
  name: ?string
  path: string[]
  constructor(name: ?string, path: string[]) {
    this.name = name
    this.path = path
  }
}

export const view = (mailbox: Mailbox<Message>) => {
  const notebook = Notebook.view({
    send(message: Notebook.Message) {
      mailbox.send({ notebook: message })
    }
  })

  return {
    notebook: notebook,
    render(model: Model, document: Document) {
      if (model.notebook) {
        return notebook.render(model.notebook, document)
      } else {
        return null
      }
    }
  }
}
