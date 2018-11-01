// @flow strict

import pluginKey from "./Key.js"
/*::
import type { EditorState, Transaction } from "../prosemirror-state/src/index.js"
*/

export default class Header {
  static onEnter(state/* : EditorState */, dispatch/* : Transaction => void */) {
    const { $head, $anchor, empty } = state.selection
    const type = state.schema.nodes.header

    if (empty) {
      const node = $head.parent
      if (node.type === type) {
        dispatch(
          state.tr.setMeta(pluginKey, [
            {
              type: "load",
              load: node.textContent
            }
          ])
        )
        return true
      } else {
        return false
      }
    } else {
      // TODO: What shoud we do if there is a selection ?
      // Right now we just don't handle this.
      return false
    }
  }
}
