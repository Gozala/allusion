// @flow strict

/*::
import { EditorState } from "./Data.js"

export type Message =
  | { tag: "onLoaded", value: {content:string, url:URL, isOwner:boolean } }
  | { tag: "onLoadError", value:Error }
  | { tag: "onEdit", value:EditorState }
*/


export const onLoaded = (
  value /*:{content:string, url:URL, isOwner:boolean }*/
) => ({
  tag: "onLoaded",
  value
})

export const onLoadError = (value /*:Error*/) => ({
  tag: "onLoadError",
  value
})
