// @flow strict

import View from "./View"

export default class Inline extends View {
  static inline: boolean = true
  static marks: string = "_"
  static content: string = "text"
  static group: string = "inline"
}
