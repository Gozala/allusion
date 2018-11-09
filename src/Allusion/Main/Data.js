// @flow strict

import * as Notebook from "../Notebook/Data.js"
import * as Library from "../Library/Data.js"
import { always } from "../../reflex/Basics.js"

/*::
export type Model = {
  notebook: MaybeSaved<Notebook.Model>;
  saveRequest:SaveRequest;
  library:Library.Model;
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

export const init = (
  notebook /*:Notebook.Model*/,
  library /*:Library.Model*/
) /*:Model*/ => ({
  saveRequest: { tag: "NotSaving" },
  notebook: { before: notebook, after: notebook },
  library
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

export const edit = (document /*:Notebook.Document*/, state /*:Model*/) =>
  updateNotebook(state, Notebook.edit(document, notebook(state)))

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

export const updateLibrary = (
  library /*:Library.Model*/,
  state /*:Model*/
) /*:Model*/ => {
  return {
    ...state,
    library
  }
}

export const notebook = (state /*:Model*/) /*:Notebook.Model*/ =>
  state.notebook.after

export const library = (state /*:Model*/) /*:Library.Model*/ => state.library

export const isReadyForShare = (state /*:Model*/) /*:boolean*/ => {
  const doc = Notebook.toDocument(notebook(state))
  if (doc == null) {
    return false
  } else {
    const { title, author, article } = doc
    if (title != "" && article.indexOf("\n") > 0) {
      return true
    } else {
      return false
    }
  }
}

export const isModified = (state /*:Model*/) /*:boolean*/ =>
  Notebook.toString(state.notebook.before) !==
  Notebook.toString(state.notebook.after)

export const toURL = (state /*:Model*/) /*:?URL*/ =>
  Notebook.toURL(notebook(state))

export const toText = (state /*:Model*/) /*:?string*/ =>
  Notebook.toString(notebook(state))

export const toUpdatedDocument = (state /*:Model*/) /*:?Notebook.Document*/ => {
  switch (state.saveRequest.tag) {
    case "NotSaving":
    case "SavingFailed": {
      const after = Notebook.toDocument(state.notebook.after)
      if (after && after.title.length > 0 && after.article.length > 30) {
        const before = Notebook.toDocument(state.notebook.before)
        if (!before || before.markup != after.markup) {
          return after
        } else {
          return null
        }
      } else {
        return null
      }
    }
    default: {
      return null
    }
  }
}

export const toDocument = (state /*:Model*/) /*:?Notebook.Document*/ =>
  Notebook.toDocument(notebook(state))

export const isOwner = (state /*:Model*/) /*:boolean*/ =>
  Notebook.isOwner(notebook(state))

export const status = (state /*:Model*/) /*:string*/ => {
  switch (state.saveRequest.tag) {
    case "NotSaving": {
      return isReadyForShare(state) ? "share" : "published"
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
