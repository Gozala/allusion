// @flow strict

import { Plugin, TextSelection } from "../prosemirror-state/src/index.js"
import { Decoration, DecorationSet } from "../prosemirror-view/src/index.js"

/*::
import type { Node } from "../prosemirror-model/src/index.js"
import type { EditorState, Selection } from "../prosemirror-state/src/index.js"
import type {  InlineDecorationSpec } from "../prosemirror-view/src/index.js"
*/

export const emptyNodeDecorations = (
  root/* : Node */
)/* : Decoration<InlineDecorationSpec>[] */ => {
  const decorations = []
  root.descendants((node, pos) => {
    if (node.attrs.placeholder != null) {
      if (node.type.isTextblock) {
        if (node.content.size === 0) {
          decorations.push(
            Decoration.node(pos, pos + node.nodeSize, {
              empty: ""
            })
          )
        }
      } else if (node.type.isBlock) {
        if (node.content.size === node.childCount * 2) {
          decorations.push(
            Decoration.node(pos, pos + node.nodeSize, {
              empty: ""
            })
          )
        }
      }
    }
  })
  return decorations
}

export const plugin = () =>
  new Plugin({
    props: {
      decorations: state =>
        DecorationSet.create(state.doc, emptyNodeDecorations(state.doc))
    }
  })
