// @flow strict

import View from "./View.js"

export default class Inline extends View {
  /*::
  static inline: boolean
  static marks: string
  static content: string
  static group: string
  */
}
Inline.inline = true
Inline.marks = "_"
Inline.content = "text"
Inline.group = "inline"