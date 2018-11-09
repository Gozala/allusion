// @flow strict

import Future from "../Future/Future.js"

export const focus = (id /*:string*/) =>
  new Future(async () => {
    const element = document.getElementById(id)
    if (element != null) {
      element.focus()
    } else {
      throw Error(`Element with #${id} not found`)
    }
  })
