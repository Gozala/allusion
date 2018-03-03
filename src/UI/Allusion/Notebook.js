// @flow

import type { DatArchive, DatURL } from "../DatArchive"
import Archive from "../DatArchive"
import { always } from "./Util"

export type Message =
  | { type: "selected", selected: DatArchive }
  | { type: "mounted", mounted: DatArchive }
  | { type: "loaded", loaded: Document }
  | { type: "saved", saved: Document }

interface Info {
  name: ?string;
  path: string[];
}

export interface Document {
  name: string;
  path: string[];
  content: string;
  time: number;
}

export type Model =
  | { status: "unmount", path: string[], select: boolean }
  | { status: "mount", document: Document }
  | {
      status: "idle" | "load" | "save",
      document: Document,
      archive: DatArchive
    }

class TheDocument implements Document {
  name: string
  path: string[]
  content: string
  time: number
  constructor(name: string, path: string[], content: string, time: number) {
    this.name = name
    this.path = path
    this.content = content
    this.time = time
  }
}

class UnmountNotebook {
  status: "unmount" = "unmount"
  select: boolean
  path: string[]
  constructor(select: boolean, path: string[]) {
    this.select = select
    this.path = path
  }
}

class MountNotebook {
  status: "mount" = "mount"
  document: Document
  constructor(document: Document) {
    this.document = document
  }
}

export class Notebook {
  status: "idle" | "load" | "save"
  document: Document
  archive: DatArchive
  constructor(
    status: "idle" | "load" | "save",
    document: Document,
    archive: DatArchive
  ) {
    this.status = status
    this.document = document
    this.archive = archive
  }

  static path(state: Model): string[] {
    switch (state.status) {
      case "unmount":
        return state.path
      default:
        return state.document.path
    }
  }
  static name(state: Model, url: DatURL): string {
    switch (state.status) {
      case "unmount":
        return url.replace("dat://", "")
      default:
        return state.document.name
    }
  }
}

export const save = (state: Model, content: string): Model => {
  if (state.status === "idle") {
    const { document: { name, path }, archive } = state
    return new Notebook(
      "save",
      new TheDocument(name, path, content, Date.now()),
      archive
    )
  } else {
    return state
  }
}

export const select = (path: string[] = []) => new UnmountNotebook(true, path)
export const unmount = (path: string[] = []) => new UnmountNotebook(false, path)

export const mount = (name: string, path: string[]): Model => {
  const document = new TheDocument(name, path, "", Date.now())
  return new MountNotebook(document)
}

export const load = (
  name: string,
  path: string[],
  archive: DatArchive
): Model => {
  const document = new TheDocument(name, path, "", Date.now())
  return new Notebook("load", document, archive)
}

export const open = (state: Model, path: string[]): Model => {
  switch (state.status) {
    case "unmount": {
      return unmount(path)
    }
    case "mount": {
      return mount(state.document.name, path)
    }
    default: {
      const document = new TheDocument(
        state.document.name,
        path,
        "",
        Date.now()
      )
      return new Notebook("load", document, state.archive)
    }
  }
}

export const idle = (state: Model, document: Document): Model => {
  switch (state.status) {
    case "unmount":
    case "mount": {
      return mount(document.name, document.path)
    }
    default: {
      return new Notebook("idle", document, state.archive)
    }
  }
}

export const init = ({ name, path }: Info): Model => {
  if (name == null) {
    return select(path)
  } else {
    return mount(name, path)
  }
}

export const update = (state: Model, message: Message): Model => {
  switch (message.type) {
    case "selected": {
      const archive = message.selected
      const path = Notebook.path(state)
      const name = Notebook.name(state, archive.url)
      return load(name, path, archive)
    }
    case "mounted": {
      const archive = message.mounted
      const path = Notebook.path(state)
      const name = Notebook.name(state, archive.url)
      return load(name, path, archive)
    }
    case "loaded": {
      return idle(state, message.loaded)
    }
    case "saved": {
      return idle(state, message.saved)
    }
    default: {
      throw Error(`Unexpected message ${JSON.stringify(message)}`)
    }
  }
}

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
  const document = new TheDocument(
    name,
    path,
    content || `/ ${documentPath}\n`,
    Date.now()
  )
  window.history.pushState(document, "", `/${name}/${documentPath}`)
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

export const saveDocument = async (
  archive: DatArchive,
  document: Document
): Promise<Document> => {
  try {
    await archive.writeFile(`${document.path.join("/")}.md`, document.content, {
      encoding: "utf8"
    })
  } catch (error) {
    console.error(`Failed to save document`, error)
  }
  return document
}

export const receive = async (state: Model): Promise<Message[]> => {
  switch (state.status) {
    case "unmount": {
      if (state.select) {
        const archive = await selectNotebook()
        return [{ type: "selected", selected: archive }]
      } else {
        return []
      }
    }
    case "mount": {
      const document = await mountNotebook(state.document.name)
      return [{ type: "mounted", mounted: document }]
    }
    case "load": {
      const { archive } = state
      const { name, path } = state.document
      const document = await loadDocument(name, path, archive)
      return [{ type: "loaded", loaded: document }]
    }
    case "save": {
      const { archive } = state
      const document = await saveDocument(archive, state.document)
      return [{ type: "saved", saved: document }]
    }
    default: {
      return []
    }
  }
}

export const send = async (state: Model): Promise<[]> => {
  return []
}
