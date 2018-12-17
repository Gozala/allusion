// @flow strict

import { StorageArea } from "../../Effect/async-local-storage.js"
import Future from "../../Future/Future.js"
import * as Dat from "../../Effect/dat.js"
/*::
import type { Document, Model } from "./Data.js"
*/

let db /*:?StorageArea<string>*/ = null

const STORE_ID = `site-storage`

const storage = () =>
  new Future(async () => {
    if (db) {
      return db
    } else {
      db = new StorageArea("settings")
      return db
    }
  })

const findDraftsDrive = () =>
  new Future(async () /*:Promise<?URL>*/ => {
    try {
      const matches = await Dat.queryLibrary({
        isOwner: true,
        type: ["allusion-drafts"]
      })
      const first = matches.shift()
      if (first) {
        return new URL(first.url)
      }
    } catch (error) {
      return null
    }
  })

const draftsDrive = () =>
  new Future(async () => {
    const db = await storage()
    const href = await db.get(STORE_ID)
    if (typeof href === "string") {
      return new URL(href)
    } else {
      const url = await findDraftsDrive()
      if (url) {
        await db.set(STORE_ID, url.href)
        return url
      }
    }
  })

export const list = (options /*:{limit:number}*/) =>
  new Future(async () /*:Promise<Model>*/ => {
    const library = {}
    let count = 0
    const url = await draftsDrive()
    if (url) {
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
    const db = await storage()
    const href = await db.get(STORE_ID)
    if (href != null) {
      return new URL(href)
    } else {
      const info = await Dat.getInfo(new URL(location.href))
      const url = await Dat.create({
        title: `Local Storage for ${info.title}`,
        description: `Local storage for: ${info.url}`,
        type: ["site-local-storage", "allusion-drafts"],
        prompt: false
      })
      await db.set(STORE_ID, url.href)
      return url
    }
  })
