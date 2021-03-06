// @flow strict

import View from "./View.js"

export default class Block extends View {
  static inline: boolean = false
  static marks: string = ""
  static content: string = "inline*"
  static group: string = "block"
}
