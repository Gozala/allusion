// @flow

import { keydownHandler } from "prosemirror-keymap"
import { Selection } from "prosemirror-state"

function arrowHandler(dir) {
  return (state, dispatch, view) => {
    if (state.selection.empty && view.endOfTextblock(dir)) {
      const side = dir == "left" || dir == "up" ? -1 : 1
      const $head = state.selection.$head
      const nextPos = Selection.near(
        state.doc.resolve(side > 0 ? $head.after() : $head.before()),
        side
      )

      if (nextPos.$head && nextPos.$head.parent.type.name == "code_block") {
        dispatch(state.tr.setSelection(nextPos))
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
