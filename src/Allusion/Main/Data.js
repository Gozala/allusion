// @flow strict

import * as Notebook from "../Notebook/Data.js"
import { always } from "../../reflex/Basics.js"

/*::
export type Model = {
  notebook: MaybeSaved<Notebook.Model>;
  saveRequest:SaveRequest;
}

export type SaveRequest =
  | { tag: "NotSaving" }
  | { tag: "Saving" }
  | { tag: "SavingFailed", value:Error }

export opaque type MaybeSaved <doc> = {
  before:doc;
  after:doc;
}
*/

const saving = always({ tag: "Saving" })
const notSaving = always({ tag: "NotSaving" })
const savingFailed = (error /*:Error*/) => ({
  tag: "SavingFailed",
  value: error
})

export const init = (notebook /*:Notebook.Model*/) /*:Model*/ => ({
  saveRequest: { tag: "NotSaving" },
  notebook: { before: notebook, after: notebook }
})

export const saved = (state /*:Model*/) /*:Model*/ => ({
  ...state,
  saveRequest: notSaving()
})

export const published = (url /*:URL*/, state /*:Model*/) /*:Model*/ => ({
  ...updateNotebook(state, Notebook.published(url, notebook(state))),
  saveRequest: notSaving()
})

export const saveFailed = (error /*:Error*/, state /*:Model*/) /*:Model*/ => ({
  ...state,
  saveRequest: savingFailed(error)
})

export const save = (state /*:Model*/) /*:Model*/ => ({
  ...state,
  saveRequest: saving(),
  notebook: { before: state.notebook.after, after: state.notebook.after }
})


export const edit = (editorState/*:Notebook.EditorState*/, state/*:Model*/) => 
  updateNotebook(state, Notebook.edit(editorState, notebook(state)))

export const updateNotebook = (
  state /*:Model*/,
  notebook /*:Notebook.Model*/
) /*:Model*/ => {
  const { before } = state.notebook
  const notebookBefore = before.status !== notebook.status ? notebook : before

  return {
    ...state,
    notebook: { before: notebookBefore, after: notebook }
  }
}

export const notebook = (state /*:Model*/) /*:Notebook.Model*/ =>
  state.notebook.after

export const isModified = (state /*:Model*/) /*:boolean*/ =>
  Notebook.toString(state.notebook.before) !==
  Notebook.toString(state.notebook.after)

export const toURL = (state /*:Model*/) /*:?URL*/ =>
  Notebook.toURL(notebook(state))

export const toText = (state /*:Model*/) /*:?string*/ =>
  Notebook.toString(notebook(state))

export const isOwner = (state /*:Model*/) /*:boolean*/ =>
  Notebook.isOwner(notebook(state))

export const status = (state /*:Model*/) /*:string*/ => {
  switch (state.saveRequest.tag) {
    case "NotSaving": {
      return isModified(state) ? "" : "published"
    }
    case "Saving": {
      return "publishing"
    }
    case "SavingFailed": {
      return "retry"
    }
    default: {
      return "unknown"
    }
  }
}
