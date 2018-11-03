// @flow strict

import { nofx, fx, batch } from "../reflex/Effect.js"
import {
  text,
  i,
  h3,
  pre,
  main,
  node,
  doc,
  body,
  button
} from "../reflex/Element.js"
import { on, className } from "../reflex/Attribute.js"
import { never } from "../reflex/Basics.js"

import * as Data from "./Main/Data.js"
import * as Inbox from "./Main/Inbox.js"
import * as Effect from "./Main/Effect.js"
import * as Decoder from "./Main/Decoder.js"
import * as Notebook from "./Notebook.js"

/*::
import type { IO } from "../reflex/Widget.js"
export type Model = Data.Model
export type Message = Inbox.Message
*/

export const init = (options /*:?{state:Model}*/, url /*:URL*/) => {
  if (options) {
    return [options.state, nofx]
  } else {
    const path = url.pathname.substr(1)
    const notebookURL = path === "" ? null : new URL(`//${path}`, url)
    const [notebook, fx] = Notebook.open(notebookURL)
    return [Data.init(notebook), fx.map(Inbox.notebook)]
  }
}

export const update = (
  message /*:Message*/,
  state /*:Model*/
) /*:[Model, IO<Message>]*/ => {
  switch (message.tag) {
    case "notebook": {
      const [notebook, fx] = Notebook.update(
        message.value,
        Data.notebook(state)
      )
      return [Data.updateNotebook(state, notebook), fx.map(Inbox.notebook)]
    }
    case "save": {
      const url = Data.toURL(state)
      const content = Data.toText(state) || ""
      const effect =
        url && Data.isOwner(state)
          ? fx(Effect.save(url, content), Inbox.onSaved, Inbox.onSaveError)
          : fx(
              Effect.saveAs(content, url),
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
    case "route": {
      return route(message.value, state)
    }
    default: {
      return never(message)
    }
  }
}

const route = (message, state) => {
  switch (message.tag) {
    case "navigate": {
      return init(null, message.value)
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
      [className("sans-serif")],
      [
        Notebook.view(Data.notebook(state)).map(Inbox.notebook),
        viewSaveButton(state)
      ]
    )
  )

const viewSaveButton = state =>
  button(
    [
      className(`fixed bottom-2 right-2 publish ${Data.status(state)}`),
      on("click", Decoder.save)
    ],
    [Data.isOwner(state) ? text("Save") : text("Fork")]
  )

export const { onInternalURLRequest, onExternalURLRequest, onURLChange } = Inbox
