// @flow strict

import { nofx, fx, batch } from "../reflex/Effect.js"
import {
  keyedNode,
  text,
  h3,
  dl,
  dt,
  dd,
  article,
  a,
  div
} from "../reflex/Element.js"
import { on, className, href } from "../reflex/Attribute.js"
import { never } from "../reflex/Basics.js"
import * as Data from "./Library/Data.js"
import * as Effect from "./Library/Effect.js"
import * as Inbox from "./Library/Inbox.js"
/*::
export type Model = Data.Model
export type Message = Inbox.Message
*/

export const init = () => [
  Data.init(),
  fx(Effect.list({ limit: 30 }), Inbox.load)
]

export const update = (message /*:Message*/, state /*:Model*/) => {
  switch (message.tag) {
    case "load": {
      return [message.value, nofx]
    }
    default: {
      return never(message)
    }
  }
}

export const view = (tagName /*:string*/, state /*:Model*/) =>
  keyedNode(
    tagName,
    [className("bg-near-white w-100 flex flex-wrap justify-center")],
    [...viewCards(state)]
  )

const viewCards = function*(state /*:Model*/) {
  for (const key in state) {
    yield [key, viewCard(key, state[key])]
  }
}

const viewCard = (key, state) =>
  a(
    [
      href(`/~/${key}`),
      className(
        "br2 ba w5 b--black-10 bg-white ma3 pa3 link dim pointer shadow-4"
      )
    ],
    [
      article(
        [className("aspect-ratio aspect-ratio--16x9")],
        [
          h3(
            [className("f5 f4-ns mb0 black-90 measure-narrow")],
            [text(state.title)]
          ),
          h3(
            [className("f6 f5 fw4 mt2 black-60 measure-narrow")],
            [text(state.author)]
          )
        ]
      )
    ]
  )
