// @flow strict

import { always } from "../../reflex/Basics.js"
/*::
import * as Notebook from "../Notebook.js"
import * as Library from "../Library.js"

export type Route =
  | { tag: "navigate", value:URL }
  | { tag: "load", value:URL }
  | { tag: "navigated", value:URL }

export type Message =
  | { tag: "route", value: Route }
  | { tag: "notebook", value: Notebook.Message }
  | { tag: "library", value: Library.Message }
  | { tag: "share", value:true }
  | { tag: "published", value:URL }
  | { tag: "saved", value:true }
  | { tag: "saveError", value:Error }
*/

export const notebook = (value /*:Notebook.Message*/) /*:Message*/ => ({
  tag: "notebook",
  value
})

export const library = (value /*:Library.Message*/) /*:Message*/ => ({
  tag: "library",
  value
})

export const route = (value /*:Route*/) /*:Message*/ => ({
  tag: "route",
  value
})

export const onSaved = always({ tag: "saved", value: true })

export const onSaveError = (value /*: mixed*/) => ({
  tag: "saveError",
  value: value instanceof Error ? value : new Error(value)
})

export const onPublished = (value /*: URL*/) => ({
  tag: "published",
  value
})

export const onInternalURLRequest = (value /*:URL*/) =>
  route({ tag: "navigate", value })

export const onExternalURLRequest = (value /*:URL*/) =>
  route({ tag: "load", value })

export const onURLChange = (value /*:URL*/) =>
  route({ tag: "navigated", value })
