// @flow strict

import { navigate, load } from "../../Effect/Navigation.js"
import { writeFile } from "../../Effect/dat.js"
import * as library from "../../library/api.js"
import Future from "../../Future/Future.js"
import * as Dat from "../../Effect/dat.js"
import * as Library from "../Library/Effect.js"
import { digest } from "../Notebook/Effect.js"

/*::
import type { Document, DocumentUpdate } from "./Data.js"
*/

export const saveAs = (content /*:string*/, name /*:string*/) =>
  new Future(async () /*:Promise<URL>*/ => {
    const encoder = new TextEncoder()
    return await library.saveFileAs(name, encoder.encode(content).buffer)
  })

export const saveChanges = ({ before, after } /*:DocumentUpdate*/) =>
  new Future(async () /*:Promise<URL>*/ => {
    const storeURL = await Library.requestSiteStore()
    const url = new URL(`/${after.title}.md`, storeURL)
    if (before != null && before.title !== after.title) {
      const oldURL = new URL(`/${before.title}.md`, storeURL)
      if (before.article === after.article && before.author && after.author) {
        await Dat.move(oldURL, url)
      } else {
        await Dat.writeFile(url, after.markup)
        await Dat.removeFile(oldURL)
      }
    } else if (before == null || before.markup !== after.markup) {
      await Dat.writeFile(url, after.markup)
    }
    return url
  })

/*::
type ListOptions = {
  +limit:number;
}
*/

export { navigate, load }
