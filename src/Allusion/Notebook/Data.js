// @flow strict

import { parse } from "../../prosemirror-allusion/Editor.js"
import { data } from "../../reflex/Attribute.js"

/*::
import type { Document } from "../../prosemirror-allusion/Editor.js"

type Draft = {
  status: "draft";
  document:Document;
}

type Loading = {
  status: "loading";
  url:URL;
}

type Failed = {
  status: "error";
  url:URL;
  message:string;
}

type Published = {
  status: "published";
  url:URL;
  isOwner: boolean;
  document:Document;
}

export type Model =
  | Draft
  | Loading
  | Failed
  | Published

export type { Document }
*/

export const toDocument = (state /*:Model*/) /*:?Document*/ => {
  switch (state.status) {
    case "published":
    case "draft": {
      return state.document
    }
    default: {
      return null
    }
  }
}

export const draft = (text /*:string*/ = "") /*:Model*/ => ({
  status: "draft",
  document: parse(text)
})

export const load = (url /*:URL*/) /*:Model*/ => ({ status: "loading", url })

export const fail = ({ message } /*:Error*/, state /*:Model*/) /*:Model*/ =>
  state.status === "loading"
    ? { status: "error", url: state.url, message }
    : state

export const open = (
  url /*:URL*/,
  isOwner /*:boolean*/,
  text /*:string*/
) /*:Model*/ =>
  url.protocol === "draft:"
    ? draft(text)
    : {
        status: "published",
        url,
        isOwner,
        document: parse(text)
      }

export const edit = (document /*:Document*/, state /*:Model*/) => {
  switch (state.status) {
    case "draft": {
      return { ...state, document }
    }
    case "published": {
      return { ...state, document }
    }
    default: {
      return state
    }
  }
}

export const published = (url /*:URL*/, state /*:Model*/) => {
  switch (state.status) {
    case "draft": {
      return {
        status: "published",
        url,
        isOwner: true,
        document: state.document
      }
    }
    case "published": {
      return { ...state, url, isOwner: true }
    }
    default: {
      return state
    }
  }
}

export const toString = (model /*:Model*/) /*:?string*/ => {
  switch (model.status) {
    case "draft":
    case "published":
      return model.document.markup
    default:
      return null
  }
}

export const toURL = (state /*:Model*/) /*:?URL*/ => {
  switch (state.status) {
    case "loading":
    case "error":
    case "published":
      return state.url
    default:
      return null
  }
}

export const isOwner = (state /*:Model*/) /*:boolean*/ => {
  switch (state.status) {
    case "draft":
      return true
    case "published":
      return state.isOwner
    default:
      return false
  }
}

export const isDraft = (state /*:Model*/) /*:boolean*/ => {
  switch (state.status) {
    case "draft":
      return true
    default:
      return false
  }
}
