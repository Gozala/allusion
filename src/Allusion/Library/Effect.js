// @flow strict

import { StorageArea } from "../../Effect/async-local-storage.js"
import Future from "../../Future/Future.js"
import * as Dat from "../../Effect/dat.js"

/*::
import type { Document, Model } from "./Data.js"
*/

const storage = new StorageArea("settings")
const STORE_ID = `site-storage`

export const list = (options /*:{limit:number}*/) =>
  new Future(async () /*:Promise<Model>*/ => {
    const href = await storage.get(STORE_ID)
    const library = {}
    let count = 0
    if (typeof href === "string") {
      const url = new URL(href)
      const entries = await Dat.readDirectoryEntries(url, { recursive: false })
      for (const { name, stat } of entries) {
        if (name.endsWith(".md")) {
          const title = name.substr(0, name.length - 3)
          library[title] = {
            title,
            author: "",
            mtime: stat.mtime.getTime(),
            ctime: stat.ctime.getTime()
          }
          // const markup = await Dat.readFile(new URL(path, url))

          if (count++ === options.limit) {
            break
          }
        }
      }
    }
    return library
  })

export const requestSiteStore = () =>
  new Future(async () /*:Promise<URL>*/ => {
    const href = await storage.get(STORE_ID)
    if (href != null) {
      return new URL(href)
    } else {
      const info = await Dat.getInfo(new URL(location.href))
      const url = await Dat.create({
        title: `Local Storage for ${info.title}`,
        description: `Local storage for: ${info.url}`,
        type: ["site-local-storage"],
        prompt: false
      })
      await storage.set(STORE_ID, url.href)
      return url
    }
  })
