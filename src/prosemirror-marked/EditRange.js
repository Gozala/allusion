// @flow strict

import {
  Transaction,
  Selection,
  TextSelection
} from "../prosemirror-state/src/index.js"
import {
  nodePosition,
  textOffsetFromPosition,
  positionFromTextOffset
} from "./Position.js"
import { createFrom } from "./Node.js"
import { EditBlock } from "./Schema.js"

/*::
import type Serializer from "./Serializer.js"
import type Parser from "./Parser.js"
*/

export const isEditBlock = EditBlock.is
export const editBlock = ({ $anchor, $head, node } /* : Selection */) =>
  node && isEditBlock(node)
    ? { index: $anchor.pos, node }
    : nodePosition(isEditBlock, $anchor)

export const updateMarkup = (
  tr /* : Transaction */,
  parser /* : Parser */,
  serializer /* : Serializer */
) /* : ?Transaction */ => {
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

    // Trim left because paragraph turned into a list will have added white
    // spaces on the left.
    if (markup.trimLeft() === serializer.serialize(output).trimLeft()) {
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
