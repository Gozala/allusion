// @flow strict


import { fromText, toText } from "../../prosemirror-allusion/Editor.js"

/*::
import { EditorState } from "../../prosemirror-state/src/index.js"

type Draft = {
  status: "draft";
  editorState:EditorState;
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
  editorState:EditorState;
}

export type Model =
  | Draft
  | Loading
  | Failed
  | Published

export type { EditorState }
*/


export const draft = (text/*:string*/="")/*:Model*/ =>
  ({ status:"draft", editorState: fromText(text) })

export const load = (url /*:URL*/) /*:Model*/ =>
  ({ status:"loading", url })

export const fail = ({message}/*:Error*/, state /*:Model*/)/*:Model*/ =>
  state.status === "loading" ? {status:"error", url:state.url, message} : state

export const open = (url /*:URL*/, isOwner /*:boolean*/, text /*:string*/)/*:Model*/ =>
  ({status:"published", url, isOwner, editorState: fromText(text) })

export const edit = (editorState/*:EditorState*/, state/*:Model*/) => {
  switch (state.status) {
    case "draft": {
      return {...state, editorState }
    }
    case "published": {
      return {...state, editorState}
    }
    default: {
      return state
    }
  }
}

export const published = (url/*:URL*/, state/*:Model*/) => {
  switch (state.status) {
    case "draft": {
      return {status:"published", url, isOwner:true, editorState: state.editorState }
    }
    case "published": {
      return {...state, url, isOwner:true}
    }
    default: {
      return state
    }
  }
}

export const toString = (model/*:Model*/)/*:?string*/ => {
  switch (model.status) {
    case "draft":
    case "published":
      return toText(model.editorState)
    default:
      return null
  }
}

export const toURL = (state/*:Model*/)/*:?URL*/ => {
  switch (state.status) {
    case "loading":
    case "error":
    case "published":
      return state.url
    default:
      return null
  }
}

export const isOwner = (state/*:Model*/)/*:boolean*/ => {
  switch (state.status) {
    case "draft": 
      return true
    case "published":
      return state.isOwner
    default:
      return false
  }
}