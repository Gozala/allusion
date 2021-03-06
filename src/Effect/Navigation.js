// @flow strict

import { nothing } from "../reflex/Basics.js"
import Future from "../Future/Future.js"

const STATE = {}
const NAV = { type: "navigate" }

const { history, location } = window.top
const dispatch = _ => {
  if (window.onnavigate) {
    window.onnavigate.handleEvent(NAV)
  }
}

export const navigate = (url /*:URL*/) =>
  new Future(async () => {
    if (location.href != url.href) {
      dispatch(history.pushState(STATE, "", url))
    }
  })

export const replaceURL = (url /*:URL*/) =>
  new Future(async () => {
    if (location.href != url.href) {
      dispatch(history.replaceState(STATE, "", url))
    }
  })

export const back = (n /*:number*/) =>
  new Future(async () => window.history.go(-1 * n))

export const forward = (n /*:number*/) =>
  new Future(async () => window.history.go(n))

export const load = (url /*:URL*/) =>
  new Future(async () => {
    try {
      window.location = url
    } catch (error) {
      window.location.reload(false)
    }
  })

export const reload = () =>
  new Future(async () => {
    window.location.reload(false)
  })

export const reloadAndSkipCache = () =>
  new Future(async () => {
    window.location.reload(true)
  })
