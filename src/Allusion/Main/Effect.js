// @flow strict

import { navigate, load } from "../../reflex/Navigation.js"
import { writeFile } from "../../Effect/dat.js"
import * as library from "../../library/api.js"
import { future } from "../../reflex/Future.js"

export const save = writeFile

export const saveAs = future(async (
  content /*:string*/,
  origin /*:?URL*/
) /*:Promise<URL>*/ => {
  const name = origin
    ? origin.pathname.substr(origin.pathname.lastIndexOf("/") + 1)
    : "stratchpad.js"
  const encoder = new TextEncoder()
  return await library.saveFileAs(name, encoder.encode(content).buffer)
})

export { navigate, load }
