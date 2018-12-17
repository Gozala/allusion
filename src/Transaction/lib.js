// @flow strict

import type { Node, Main } from "../reflex/Widget.js"

interface Port<message> {
  send(message): mixed;
}

interface Process<process, message> {
  spawn(): process;
  trasact(message, process): process;
}

interface ServiceProcess<model, response, request, process>
  extends Process<process, response> {
  init: () => process;
  update: (response, model) => process;

  state: process => model;
  requests: process => Iterator<request>;

  perform: request => Promise<response>;
}

interface UIProcess<data, model, response, request, process>
  extends ServiceProcess<model, response, request, process> {
  view: data => Node<request>;
  query: model => data;
}

export type Program<message, state, widget, options, request, process> = {
  +init: options => process,
  +update: (message, state) => process,
  +state: process => state,
  +requests: process => Iterator<request>,
  +perform: request => Promise<message>,
  +view: state => widget
}

export type Application<message, state, widget, options, request, process> = {
  onExternalURLRequest: URL => message,
  onInternalURLRequest: URL => message,
  onURLChange: URL => message,

  +init: (options, URL) => process,
  +update: (message, state) => process,
  +state: process => state,
  +requests: process => Iterator<request>,
  +perform: request => Promise<message>,
  +view: state => widget
}

class State<model, out> {
  +state: model
  +outbox: out[]

  constructor(state /*:model*/, outbox /*:out[]*/ = []) {
    this.state = state
    this.outbox = outbox
  }
  request(message /*:out*/) /*:State<model, out>*/ {
    return new State(this.state, [...this.outbox, message])
  }
  static new(state /*:model*/) /*:State<model, out>*/ {
    return new State(state, [])
  }
  static request(state /*:model*/, message /*:out*/) /*:State<model, out>*/ {
    return new State(state, [message])
  }
}

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

import * as Data from "../Allusion/Main/Data.js"
import * as Router from "../Allusion/Main/Router.js"
import * as Inbox from "../Allusion/Main/Inbox.js"
import * as Effect from "../Allusion/Main/Effect.js"
import * as Decoder from "../Allusion/Main/Decoder.js"
import * as Notebook from "../Allusion/Notebook.js"
import * as Library from "../Allusion/Library.js"
/*::
import type { IO } from "../reflex/Widget.js"
export type Model = Data.Model
export type Message = Inbox.Message
*/

/*::
declare class Library$State {}
declare class Library$Out {}

declare var $Library:ServiceProcess<Library.Model, Library.Message, Library$Out, Library$State>

declare class Notebook$State {}
declare class Notebook$Out {}
declare var $Notebook:ServiceProcess<Notebook.Model, Notebook.Message, Notebook$Out, Notebook$State>

export type Response = Message
export type Request =
  | { tag:"load", value:URL}
  | { tag:"navigate", value:URL}
  | { tag:"share", value:{title:string, content:string} }
  | { tag:"saveChanges", value:Data.DocumentUpdate}
  | { tag:"notebook", value:Notebook$Out }
  | { tag:"library", value:Library$Out }

type Self = {
  state:Model;
  request?:Request;
  notebook?:Notebook$State;
  library?:Library$State;
}
*/

export const state = (process /*:Self*/) => process.state
export const requests = function*(process /*:Self*/) /*:Iterator<Request>*/ {
  const { request, notebook, library } = process
  if (request) {
    yield request
  }

  if (notebook) {
    for (const request of $Notebook.requests(notebook)) {
      yield { tag: "notebook", value: request }
    }
  }

  if (library) {
    for (const request of $Library.requests(library)) {
      yield { tag: "library", value: request }
    }
  }
}

export const perform = async (request /*:Request*/) /*:Promise<?Response>*/ => {
  switch (request.tag) {
    case "share": {
      const { content, title } = request.value
      const url = await Effect.publish(content, title)
      return Inbox.onPublished(url)
    }
    case "saveChanges": {
      const url = await Effect.saveChanges(request.value)
      return Inbox.onSaved()
    }
    case "load": {
      await Effect.load(request.value)
      return null
    }
    case "navigate": {
      await Effect.navigate(request.value)
      return null
    }
    case "notebook": {
      const response = await $Notebook.perform(request.value)
      return Inbox.notebook(response)
    }
    case "library": {
      const response = await $Library.perform(request.value)
      return Inbox.library(response)
    }
    default: {
      return never(request)
    }
  }
}

export const init = (options /*:?{state:Model}*/, url /*:URL*/) /*:Self*/ => {
  if (options) {
    return {
      state: options.state
    }
  } else {
    const library = $Library.init()
    const notebook = $Notebook.init()
    const state = Data.init($Notebook.state(notebook), $Library.state(library))
    return { state, library, notebook }
  }
}

export const update = (message /*:Message*/, state /*:Model*/) /*:Self*/ => {
  switch (message.tag) {
    case "route": {
      return route(message.value, state)
    }
    case "notebook": {
      const notebook = $Notebook.update(message.value, Data.notebook(state))
      const newState = Data.updateNotebook(state, $Notebook.state(notebook))
      // const noteEffect = effect.map(Inbox.notebook)
      const delta = Data.toDocumentUpdate(newState)
      if (delta) {
        return {
          state: newState,
          notebook,
          request: { tag: "saveChanges", value: delta }
        }
      } else {
        return {
          state: newState,
          notebook
        }
      }
    }
    case "library": {
      const library = $Library.update(message.value, Data.library(state))
      return { state, library }
    }
    case "share": {
      const url = Data.toURL(state)
      const content = Data.toText(state) || ""
      const title = content.slice(1, content.indexOf("\n") + 1).trim()
      const request = { tag: "share", value: { title, content } }
      return { state, request }
    }
    case "saved": {
      return { state: Data.saved(state) }
    }
    case "published": {
      const url = message.value
      const request = {
        tag: "navigate",
        value: new URL(`/${url.hostname}${url.pathname}`, location.href)
      }
      return { state, request }
    }
    case "saveError": {
      return { state: Data.saveFailed(message.value, state) }
    }
    default: {
      return never(message)
    }
  }
}

const route = (message, state) /*:Self*/ => {
  switch (message.tag) {
    case "navigate": {
      return { ...init(null, message.value), request: message }
    }
    case "navigated": {
      return { state }
    }
    case "load": {
      return { state, request: message }
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
