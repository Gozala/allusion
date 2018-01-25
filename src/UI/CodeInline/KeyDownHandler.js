// @flow

import { keydownHandler } from "prosemirror-keymap"
import { Selection } from "prosemirror-state"

function arrowHandler(dir) {
  return (state, dispatch, view) => {
    console.log(">>>", state.selection.empty, view.endOfTextblock(dir, state))
    if (state.selection.empty && view.endOfTextblock(dir)) {
      const side = dir == "left" || dir == "up" ? -1 : 1
      const { $head } = state.selection
      const position = state.doc.resolve(
        side > 0 ? $head.after() : $head.before()
      )
      const selection = Selection.near(position, side)

      console.log(position, selection)
      if (position.$head && position.$head.parent.type.name == "code_inline") {
        dispatch(state.tr.setSelection(position))
        return true
      }
    }
    return false
  }
}

export default keydownHandler({
  ArrowLeft: arrowHandler("left"),
  ArrowRight: arrowHandler("right"),
  ArrowUp: arrowHandler("up"),
  ArrowDown: arrowHandler("down")
})
