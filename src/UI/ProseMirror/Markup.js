// @flow strict

import { Plugin, TextSelection } from "prosemirror-state"
import type { Node, ResolvedPos } from "prosemirror-model"
import type { EditorState, Selection } from "prosemirror-state"
import { EditBlock, EditNode } from "../Allusion/Schema"
import { nodePosition } from "./Position"
import { findEditRange } from "./Marks"
import {
  Decoration,
  DecorationSet,
  type InlineDecorationSpec
} from "prosemirror-view"

export const isEditBlock = (node: Node): boolean =>
  node.type.spec instanceof EditBlock

export const isEditNode = (node: Node): boolean =>
  node.type.spec instanceof EditNode

export const nodeDecoration = (attrs: Object) => (offset: number, node: Node) =>
  Decoration.node(offset, offset + node.nodeSize, attrs)

export const inlineDecoration = (
  attrs: Object,
  spec?: InlineDecorationSpec
) => (from: number, to: number) => Decoration.inline(from, to, attrs, spec)

export const inlineBlockDecoration = (
  attrs: Object,
  spec?: InlineDecorationSpec
) => (offset: number, node: Node) =>
  Decoration.inline(offset, offset + node.nodeSize, attrs, spec)

export const blockDecoration = nodeDecoration({ "data-edit-block": "" })

export const editBlockDecoration = inlineBlockDecoration(
  {
    "data-edit-block-range": ""
  },
  {
    inclusiveStart: false,
    inclusiveEnd: false
  }
)

export const editRangeDecoration = inlineDecoration(
  { "data-edit-range": "" },
  {
    inclusiveStart: false,
    inclusiveEnd: false
  }
)

export const decorations = (state: EditorState): DecorationSet => {
  const { $anchor, $head, node } = state.selection
  const block = editBlock(state.selection)
  if (block == null) {
    return DecorationSet.empty
  } else {
    const [start, end] = findEditRange($anchor, isEditNode)

    return DecorationSet.create(state.doc, [
      blockDecoration(block.index, block.node),
      editBlockDecoration(block.index, block.node),
      editRangeDecoration(start, end)
    ])
  }
}

export const editBlock = ({ $anchor, node }: Selection) =>
  node && isEditBlock(node)
    ? { index: $anchor.pos, node }
    : nodePosition(isEditBlock, $anchor)

export const plugin = () =>
  new Plugin({
    props: {
      decorations: decorations
    }
  })
