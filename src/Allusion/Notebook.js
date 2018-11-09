// @flow strict

import { nofx, fx, batch } from "../reflex/Effect.js"
import { text, customElement, div } from "../reflex/Element.js"
import {
  className,
  on,
  src,
  srcset,
  alt,
  data,
  attribute,
  property
} from "../reflex/Attribute.js"
import { never } from "../reflex/Basics.js"

import * as Decoder from "./Notebook/Decoder.js"
import Editor from "../prosemirror-allusion/Editor.js"
import * as Data from "./Notebook/Data.js"
import * as Inbox from "./Notebook/Inbox.js"
import { keyedNode, node } from "../reflex/VirtualDOM.js"
import * as Effect from "./Notebook/Effect.js"

/*::
export type Model = Data.Model
export type Message = Inbox.Message
*/

const draft = () => {
  return [Data.draft(""), nofx]
}

export const load = (url /*:URL*/) => [
  Data.load(url),
  fx(Effect.load(url), Inbox.onLoaded, Inbox.onLoadError)
]

export const open = (url /*:?URL*/) => (url ? load(url) : draft())

export const update = (message /*:Message*/, state /*:Model*/) => {
  switch (message.tag) {
    case "onLoaded": {
      const { url, content, isOwner } = message.value
      return [Data.open(url, isOwner, content), nofx]
    }
    case "onLoadError": {
      return [Data.fail(message.value, state), nofx]
    }
    case "onEdit": {
      return [Data.edit(message.value, state), nofx]
    }
    default: {
      return never(message)
    }
  }
}

export const view = (state /*:Model*/) => {
  switch (state.status) {
    case "loading":
      return viewLoading(state.url)
    case "error":
      return viewError(state.url, state.message)
    case "draft":
      return viewDraft(state.document)
    default:
      return viewDocument(state.isOwner, state.document)
  }
}

const viewLoading = url => div([], [text(`Loading document ${url.href}`)])
const viewError = (url, reason) =>
  div([], [text(`Failed to load ${url.href} : ${reason}`)])
const viewDraft = document => viewDocument(true, document)
const viewDocument = (isOwner, document) =>
  customElement("text-editor", Editor, [
    className("flex min-vh-100 w-100 measure-wide f4"),
    on("change", Decoder.onEdit),
    property("document", document)
  ])
