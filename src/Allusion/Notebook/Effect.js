// @flow strict

import Future from "../../Future/Future.js"
import * as Dat from "../../Effect/dat.js"
import * as Library from "../Library/Effect.js"

export const load = (url /*:URL*/) =>
  new Future(async () => {
    const content = await Dat.readFile(url)
    const { isOwner } = await Dat.getInfo(url)
    return { url, content, isOwner }
  })

export const open = (name /*:string*/) =>
  new Future(async () => {
    const store = await Library.requestSiteStore()
    const content = await Dat.readFile(new URL(`/${name}.md`, store))
    const url = new URL(`draft:${name}.md`)
    return { url, content, isOwner: true }
  })

/*::
  export type Algorithm =
  | "SHA-1"
  | "SHA-256"
  | "SHA-384"
  | "SHA-512"
  */

const encoder = new TextEncoder()
export const encode = (content /*:string*/) /*:ArrayBuffer*/ =>
  encoder.encode(content).buffer

const decoder = new TextDecoder()
export const decode = (buffer /*:ArrayBuffer*/) /*:string*/ =>
  decoder.decode(buffer)

export const toHEX = (buffer /*:ArrayBuffer*/) /*:string*/ => {
  const hexCodes = []
  const view = new DataView(buffer)
  for (let i = 0; i < view.byteLength; i += 4) {
    // Using getUint32 reduces the number of iterations needed (we process 4 bytes each time)
    const value = view.getUint32(i)
    // toString(16) will give the hex representation of the number without padding
    const stringValue = value.toString(16)
    // We use concatenation and slice for padding
    const padding = "00000000"
    const paddedValue = (padding + stringValue).slice(-padding.length)
    hexCodes.push(paddedValue)
  }

  // Join all the hex strings into one
  return hexCodes.join("")
}

export const digest = (buffer /*:ArrayBuffer*/, algorithm /*:Algorithm*/) =>
  new Future(async () => await window.crypto.subtle.digest(algorithm, buffer))
