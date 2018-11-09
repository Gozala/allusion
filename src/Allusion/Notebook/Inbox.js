// @flow strict

/*::
import type { Document } from "./Data.js"

export type Message =
  | { tag: "onLoaded", value: {content:string, url:URL, isOwner:boolean } }
  | { tag: "onLoadError", value:Error }
  | { tag: "onEdit", value:Document }
*/

export const onLoaded = (
  value /*:{content:string, url:URL, isOwner:boolean }*/
) => ({
  tag: "onLoaded",
  value
})

export const onLoadError = (value /*:mixed*/) => ({
  tag: "onLoadError",
  value: value instanceof Error ? value : new Error(value)
})
