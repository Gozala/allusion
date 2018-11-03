// @flow strict

import { future } from "../../reflex/Future.js"
import * as Dat from "../../Effect/dat.js"

export const load = future(async (url /*:URL*/) => {
  const content = await Dat.readFile(url)
  const { isOwner } = await Dat.getInfo(url)
  return { url, content, isOwner }
})
