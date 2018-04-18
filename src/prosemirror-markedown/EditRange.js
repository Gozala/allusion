// @flow strict

import { Transaction } from "prosemirror-state"
import { Selection, TextSelection } from "prosemirror-state"
import type Serializer from "./Serializer"
import type Parser from "./Parser"

import {
  nodePosition,
  textOffsetFromPosition,
  positionFromTextOffset
} from "./Position"
import { createFrom } from "./Node"
import { EditBlock } from "./Schema"

export const isEditBlock = EditBlock.is
export const editBlock = ({ $anchor, $head, node }: Selection) =>
  node && isEditBlock(node)
    ? { index: $anchor.pos, node }
    : nodePosition(isEditBlock, $anchor)

export const updateMarkup = (
  tr: Transaction,
  parser: Parser,
  serializer: Serializer
): ?Transaction => {
  const block = editBlock(tr.selection)
  if (block) {
    const { index, node } = block

    const markup = serializer.serialize(node)
    const content = node.isBlock
      ? parser.parse(markup)
      : parser.parseInline(markup)

    if (content instanceof Error) {
      console.error(content)
      return null
    }
    const output =
      content.firstChild && createFrom(node.type, content.firstChild)

    if (output == null || node.eq(output)) {
      return null
    }

    if (markup === serializer.serialize(output)) {
      const offset = textOffsetFromPosition(tr.doc, tr.selection.from)
      if (offset) {
        tr.replaceRangeWith(index, index + node.nodeSize, output)
        const position = positionFromTextOffset(tr.doc, offset)
        if (position) {
          return tr.setSelection(TextSelection.create(tr.doc, position))
        }
      }
    }
  }

  return null
}
