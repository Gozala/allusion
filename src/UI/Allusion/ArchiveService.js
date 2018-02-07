// @noflow

import type { DatArchive, DatURL } from "../DatArchive"
import Archive from "../DatArchive"
import type { Mailbox, Subscription } from "./Program"
import Agent from "./Agent"

class ArchiveService {
  archives: Map<string, DatArchive>
  documents: Set<string>
  constructor(archives: Map<string, DatArchive>, documents: Set<string>) {
    this.archives = archives
    this.documents = documents
  }

  static async read(
    self: ArchiveService,
    { url, path }
  ): Promise<[ArchiveService, ?string]> {
    const id = `${url}/${path}`
    if (self.documents.has(id)) {
      return [self, null]
    } else {
      const archive = self.archives.get(url)
      if (archive) {
        const content = await archive.readFile(path, { encoding: "utf8" })
        return [self, content]
      } else {
        const archive = Archive.new(await Archive.resolveName(url))
        const content = await archive.readFile(path, { encoding: "utf8" })
        const archives = new Map(self.archives)
        archives.set(url, archive)
        const documents = new Set(self.documents)
        documents.add(id)
        return [new ArchiveService(archives, documents), content]
      }
    }
  }
}

export const spawn = () =>
  Agent.spawn(async () => new ArchiveService(new Map(), new Set()))

export const read = async (
  agent: Agent<ArchiveService>,
  url: string,
  path: string
): Promise<?string> => Agent.call(agent, ArchiveService.read, { url, path })
