// @flow strict

import { diff, diffSource, encode } from "./src/UI/ProseMirror/Diff"
import { Transform } from "prosemirror-transform"
import Schema from "./src/UI/Allusion/Schema"
import Parser from "./src/UI/Allusion/Parser"
import { EditorState, Selection, TextSelection } from "prosemirror-state"

Object.defineProperty(Transform.prototype, ("toString": string), {
  value() {
    return `Transform [\n${this.steps
      .map(x => JSON.stringify(x, null, 2))
      .join("\n")}]`
  }
})

{
  const before = "# hi there!"
  const after = "# hi **there**!"

  let docBefore = Parser.parse(before) //?$.toString()
  let docAfter = Parser.parse(after) //?$.toString()

  docBefore.content.findDiffStart(docAfter.content) //?
  docBefore.content.findDiffEnd(docAfter.content) //?

  encode(docBefore) //?
  encode(docAfter) //?

  docAfter.content.content[0].content //?

  diffSource(
    encode(docBefore), //?
    encode(docAfter) //?
  ) //?

  let tr = new Transform(docBefore)
  let delta = diff(docBefore, docAfter, tr) //?$.toString()

  delta.doc.toString() //?
  // tr.steps[0].slice.toString() //?
  // before.slice(0, 10).toString() //?
}

{
  const before = "# hi there!"
  const after = "# hi **there**!"

  let docBefore = Parser.parse(before) //?$.toString()
  let docAfter = Parser.parse(after) //?$.toString()

  encode(docBefore) //?
  encode(docAfter) //?

  diffSource(
    encode(docBefore), //?
    encode(docAfter), //?
    6
  ) //?

  let tr = new Transform(docBefore)
  let delta = diff(docBefore, docAfter, tr, 6) //?$.toString()
}
