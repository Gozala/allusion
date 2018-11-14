// @flow strict

import { nofx, fx, batch } from "../reflex/Effect.js"
import {
  text,
  i,
  h3,
  pre,
  main,
  footer,
  node,
  doc,
  body,
  button,
  aside,
  div
} from "../reflex/Element.js"
import { on, className } from "../reflex/Attribute.js"
import { never } from "../reflex/Basics.js"

import * as Data from "./Main/Data.js"
import * as Router from "./Main/Router.js"
import * as Inbox from "./Main/Inbox.js"
import * as Effect from "./Main/Effect.js"
import * as Decoder from "./Main/Decoder.js"
import * as Notebook from "./Notebook.js"
import * as Library from "./Library.js"
/*::
import type { IO } from "../reflex/Widget.js"
export type Model = Data.Model
export type Message = Inbox.Message
*/

export const init = (options /*:?{state:Model}*/, url /*:URL*/) => {
  if (options) {
    return [options.state, nofx]
  } else {
    const [library, libEffect] = Library.init()
    const [notebook, noteEffect] = initNotebook(url)
    return [
      Data.init(notebook, library),
      batch(noteEffect.map(Inbox.notebook), libEffect.map(Inbox.library))
    ]
  }
}

const initNotebook = url => {
  const route = Router.fromURL(url)
  switch (route.tag) {
    case "root":
      return Notebook.draft()
    case "draft":
      return Notebook.open(route.value)
    case "published":
      return Notebook.load(route.value)
    default:
      return never(route)
  }
}

export const update = (
  message /*:Message*/,
  state /*:Model*/
) /*:[Model, IO<Message>]*/ => {
  switch (message.tag) {
    case "route": {
      return route(message.value, state)
    }
    case "notebook": {
      const [notebook, effect] = Notebook.update(
        message.value,
        Data.notebook(state)
      )
      const newState = Data.updateNotebook(state, notebook)
      const noteEffect = effect.map(Inbox.notebook)
      const delta = Data.toDocumentUpdate(newState)
      if (delta) {
        const saveEffect = fx(
          Effect.saveChanges(delta),
          Inbox.onSaved,
          Inbox.onSaveError
        )
        return [Data.save(newState), batch(noteEffect, saveEffect)]
      } else {
        return [newState, noteEffect]
      }
    }
    case "library": {
      const [library, fx] = Library.update(message.value, Data.library(state))
      return [Data.updateLibrary(library, state), fx.map(Inbox.library)]
    }
    case "share": {
      const url = Data.toURL(state)
      const content = Data.toText(state) || ""
      const title = content.slice(1, content.indexOf("\n") + 1).trim()
      const effect = fx(
        Effect.saveAs(content, `${title}.md`),
        Inbox.onPublished,
        Inbox.onSaveError
      )
      return [Data.save(state), effect]
    }
    case "saved": {
      return [Data.saved(state), nofx]
    }
    case "published": {
      const url = message.value
      return [
        Data.published(url, state),
        fx(
          Effect.navigate(
            new URL(`/${url.hostname}${url.pathname}`, location.href)
          )
        )
      ]
    }
    case "saveError": {
      return [Data.saveFailed(message.value, state), nofx]
    }
    default: {
      return never(message)
    }
  }
}

const route = (message, state) => {
  switch (message.tag) {
    case "navigate": {
      const [state, effect] = init(null, message.value)
      return [state, batch(fx(Effect.navigate(message.value)), effect)]
    }
    case "navigated": {
      return [state, nofx]
    }
    case "load": {
      return [state, fx(Effect.load(message.value))]
    }
    default: {
      return never(message)
    }
  }
}

export const view = (state /*:Model*/) =>
  doc(
    "",
    body(
      [className("sans-serif bg-white")],
      [
        main(
          [
            className(
              "flex bb b--black-10 bg-white flex-column min-vh-100 items-center relative"
            )
          ],
          [
            Notebook.view(Data.notebook(state)).map(Inbox.notebook),
            aside(
              [
                className(
                  "flex sticky events-none bottom-0 w-100 pa3 justify-end"
                )
              ],
              [viewSaveButton(state)]
            )
          ]
        ),
        Library.view("footer", state.library)
      ]
    )
  )

const viewSaveButton = state =>
  button(
    [
      className(`bg-silver events pointer ${Data.status(state)}`),
      on("click", Decoder.save)
    ],
    []
  )

export const { onInternalURLRequest, onExternalURLRequest, onURLChange } = Inbox
