// @flow strict

/*::
import * as Data from "./Data.js"

export type Message =
  | { tag:"load", value:Data.Model }
*/

export const load = (value /*:Data.Model*/) /*:Message*/ => ({
  tag: "load",
  value
})
