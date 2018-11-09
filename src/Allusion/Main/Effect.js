// @flow strict

import { navigate, load } from "../../Effect/Navigation.js"
import { writeFile } from "../../Effect/dat.js"
import * as library from "../../library/api.js"
import Future from "../../Future/Future.js"
import * as Dat from "../../Effect/dat.js"
import * as Library from "../Library/Effect.js"
import { digest } from "../Notebook/Effect.js"

/*::
import type { Document } from "../Notebook/Data.js"
*/

export const saveAs = (content /*:string*/, name /*:string*/) =>
  new Future(async () /*:Promise<URL>*/ => {
    const encoder = new TextEncoder()
    return await library.saveFileAs(name, encoder.encode(content).buffer)
  })

export const save = (document /*:Document*/) =>
  new Future(async () /*:Promise<URL>*/ => {
    const storeURL = await Library.requestSiteStore()
    const url = new URL(`/${document.title}.md`, storeURL)
    await Dat.writeFile(url, document.markup)
    return url
  })

/*::
type ListOptions = {
  +limit:number;
}
*/

export { navigate, load }
