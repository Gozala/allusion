// @flow

import type { DatArchive, DatURL } from "../DatArchive"
import * as Editor from "../Editor"
import Archive from "../DatArchive"
import always from "always.flow"
import type { Mailbox } from "../Program"
import match from "match.flow"

export type Message =
  // | { selected: DatArchive }
  // | { mounted: DatArchive }
  // | { loaded: Document }
  // | { saved: Document }
  { edit: Editor.Message } | { mount: DatArchive } | { open: Document }

interface Info {
  name: ?string;
  path: string[];
}

// export interface Document {
//   name: string;
//   path: string[];
//   state: Editor.Model;
// }

export type Document = Editor.Model
export type Model = Draft | Archived

// class TheDocument implements Document {
//   name: string
//   path: string[]
//   state: Editor.Model
//   time: number
//   constructor(name: string, path: string[], state: Editor.Model) {
//     this.name = name
//     this.path = path
//     this.state = state
//   }
// }

// class UnmountNotebook {
//   status: "unmount" = "unmount"
//   select: boolean
//   path: string[]
//   constructor(select: boolean, path: string[]) {
//     this.select = select
//     this.path = path
//   }
// }

// class MountNotebook {
//   status: "mount" = "mount"
//   document: Document
//   constructor(document: Document) {
//     this.document = document
//   }
// }

export const draft = (): Model => Draft.new()
export const open = (name: string, path: string[]): Model =>
  Archived.new(name, path)

export class Draft {
  document: Document
  constructor(document: Document) {
    this.document = document
  }
  static new() {
    return new Draft(Editor.init())
  }
  mount(archive: DatArchive): Model {
    return this
  }
  open(document: Document): Model {
    return this
  }
  edit(message: Editor.Message): Model {
    return new Draft(Editor.update(message, this.document))
  }
}

export class Archived {
  path: string[]
  name: string
  archive: ?DatArchive
  document: ?Document
  constructor(
    name: string,
    path: string[],
    archive: ?DatArchive,
    document: ?Document
  ) {
    this.path = path
    this.name = name
    this.archive = archive
    this.document = document
  }
  static new(name: string, path: string[]) {
    return new Archived(name, path, null, null)
  }
  mount(archive: DatArchive): Model {
    return new Archived(this.name, this.path, archive, this.document)
  }
  open(document: Document): Model {
    return new Archived(this.name, this.path, this.archive, document)
  }
  edit(message: Editor.Message): Model {
    if (this.document) {
      return new Archived(
        this.name,
        this.path,
        this.archive,
        Editor.update(message, this.document)
      )
    } else {
      return this
    }
  }
}

// export class Notebook {
//   status: "idle" | "load" | "save"
//   document: Document
//   archive: DatArchive
//   constructor(
//     status: "idle" | "load" | "save",
//     document: Document,
//     archive: DatArchive
//   ) {
//     this.status = status
//     this.document = document
//     this.archive = archive
//   }

//   static path(state: Model): string[] {
//     switch (state.status) {
//       case "unmount":
//         return state.path
//       default:
//         return state.document.path
//     }
//   }
//   static name(state: Model, url: DatURL): string {
//     switch (state.status) {
//       case "unmount":
//         return url.replace("dat://", "")
//       default:
//         return state.document.name
//     }
//   }
// }

// export const save = (state: Model, content: string): Model => {
//   if (state.status === "idle") {
//     const { document: { name, path }, archive } = state
//     return new Notebook(
//       "save",
//       new TheDocument(name, path, Editor.parse(content)),
//       archive
//     )
//   } else {
//     return state
//   }
// }

// export const select = (path: string[] = []) => new UnmountNotebook(true, path)
// export const unmount = (path: string[] = []) => new UnmountNotebook(false, path)

// export const mount = (name: string, path: string[]): Model => {
//   const document = new TheDocument(name, path, Editor.init())
//   return new MountNotebook(document)
// }

// export const load = (
//   name: string,
//   path: string[],
//   archive: DatArchive
// ): Model => {
//   const document = new TheDocument(name, path, Editor.init())
//   return new Notebook("load", document, archive)
// }

// export const open = (state: Model, path: string[]): Model => {
//   switch (state.status) {
//     case "unmount": {
//       return unmount(path)
//     }
//     case "mount": {
//       return mount(state.document.name, path)
//     }
//     default: {
//       const document = new TheDocument(state.document.name, path, Editor.init())
//       return new Notebook("load", document, state.archive)
//     }
//   }
// }

// export const idle = (state: Model, document: Document): Model => {
//   switch (state.status) {
//     case "unmount":
//     case "mount": {
//       return mount(document.name, document.path)
//     }
//     default: {
//       return new Notebook("idle", document, state.archive)
//     }
//   }
// }

// export const init = ({ name, path }: Info): Model => {
//   if (name == null) {
//     return select()
//   } else {
//     return mount(name, path)
//   }
// }

export const update = match({
  // selected(archive: DatArchive, state: Model) {
  //   const path = Notebook.path(state)
  //   const name = Notebook.name(state, archive.url)
  //   return load(name, path, archive)
  // },
  // mounted(archive: DatArchive, state: Model) {
  //   const path = Notebook.path(state)
  //   const name = Notebook.name(state, archive.url)
  //   return load(name, path, archive)
  // },
  // loaded(document: Document, state: Model) {
  //   return idle(state, document)
  // },
  // saved(document: Document, state: Model) {
  //   return idle(state, document)
  // },
  mount(archive: DatArchive, state: Model) {
    return state.mount(archive)
  },
  open(document: Document, state: Model) {
    return state.open(document)
  },
  edit(message: Editor.Message, state: Model) {
    return state.edit(message)
  }
})

const selectNotebook = (): Promise<DatArchive> =>
  Archive.selectArchive({
    title: "Archive for storing your documents",
    buttonLabel: "select"
  })

const mountNotebook = async (name: string): Promise<DatArchive> => {
  const url = await Archive.resolveName(`dat://${name}`)
  const archive = Archive.new(url)
  window.localStorage.notebookName = name
  return archive
}

const loadDocument = async (
  name: string,
  path: string[],
  archive: DatArchive
): Promise<Document> => {
  const documentPath = path.join("/")
  const content = await readDocument(archive, documentPath)
  window.localStorage.documentPath = documentPath
  const document = content ? Editor.parse(content) : Editor.init()
  window.history.pushState(
    JSON.parse(JSON.stringify(document)),
    "",
    `/${name}/${documentPath}`
  )
  return document
}

export const readDocument = async (
  archive: DatArchive,
  path: string
): Promise<?string> => {
  try {
    return await archive.readFile(`${path}.md`, { encoding: "utf8" })
  } catch (error) {
    return null
  }
}

// export const saveDocument = async (
//   archive: DatArchive,
//   document: Document
// ): Promise<Document> => {
//   try {
//     await archive.writeFile(
//       `${document.path.join("/")}.md`,
//       Editor.serialize(document.state),
//       {
//         encoding: "utf8"
//       }
//     )
//   } catch (error) {
//     console.error(`Failed to save document`, error)
//   }
//   return document
// }

// export const receive = async (state: Model): Promise<Message[]> => {
//   switch (state.status) {
//     case "unmount": {
//       if (state.select) {
//         const archive = await selectNotebook()
//         return [{ type: "selected", selected: archive }]
//       } else {
//         return []
//       }
//     }
//     case "mount": {
//       const document = await mountNotebook(state.document.name)
//       return [{ type: "mounted", mounted: document }]
//     }
//     case "load": {
//       const { archive } = state
//       const { name, path } = state.document
//       const document = await loadDocument(name, path, archive)
//       return [{ type: "loaded", loaded: document }]
//     }
//     case "save": {
//       const { archive } = state
//       const document = await saveDocument(archive, state.document)
//       return [{ type: "saved", saved: document }]
//     }
//     default: {
//       return []
//     }
//   }
// }

export const receive = async (state: Model): Promise<Message[]> => {
  if (state instanceof Draft) {
    return []
  } else {
    const { archive, document } = state
    if (archive == null) {
      const archive = await mountNotebook(state.name)
      return [{ mount: archive }]
    } else if (document == null) {
      const document = await loadDocument(state.name, state.path, archive)
      return [{ open: document }]
    } else {
      return []
    }
  }
}

// export const view = (mailbox: Mailbox<Message>) =>
//   Editor.view({
//     send(message: Editor.Message) {
//       mailbox.send({ edit: message })
//     }
//   })

export const view = (mailbox: Mailbox<Message>) => {
  const editor = Editor.view({
    send(message: Editor.Message) {
      return mailbox.send({ edit: message })
    }
  })

  return {
    editor: editor,
    render(state: Model, root: *): ?Element {
      const { document } = state
      if (document) {
        const base = window.document.querySelector("base")
        if (base && state instanceof Archived) {
          const { name, path } = state
          base.setAttribute("href", `dat://${name}/${path.join("/")}/`)
        }
        return editor.render(document, root)
      } else {
        return null
      }
    }
  }
}
