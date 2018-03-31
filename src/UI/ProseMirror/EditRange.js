// @flow strict

import type { Transaction } from "prosemirror-state"
import type { Node, Schema, ResolvedPos } from "prosemirror-model"
import { findMarkupRange } from "./Marks"
import { Selection, TextSelection } from "prosemirror-state"
import { Fragment, Slice, Mark, NodeRange } from "prosemirror-model"
import Parser from "../Allusion/Parser"
import Serializer from "../Allusion/Serializer"
import { Decoration, DecorationSet } from "prosemirror-view"
import type { Mapping } from "prosemirror-transform"
import {
  nodePosition,
  textOffsetFromPosition,
  positionFromTextOffset
} from "./Position"
import { expandRange, expandNode, expandFragment } from "../ProseMirror/Expand"
import {
  collapseRange,
  collapseNode,
  collapseFragment
} from "../ProseMirror/Collapse"
import ChangeList from "../ProseMirror/ChangeList"
import { createFrom } from "../ProseMirror/Node"

export interface Range {
  index: number;
  length: number;
}

export class EditRange implements Range {
  index: number
  length: number
  decorations: DecorationSet
  constructor(index: number, length: number, decorations: DecorationSet) {
    this.index = index
    this.length = length
    this.decorations = decorations
  }
  static empty = new EditRange(0, 0, DecorationSet.empty)
  static attributes = { nodeName: "span", class: "edit-range" }
  static options = {
    inclusiveStart: true,
    inclusiveEnd: true
  }
  static new(index: number, length: number, doc: Node) {
    if (length === 0) {
      return new EditRange(index, length, DecorationSet.empty)
    } else {
      const decoration = Decoration.node(
        index,
        index + length,
        EditRange.attributes,
        EditRange.options
      )
      return new EditRange(
        index,
        length,
        DecorationSet.create(doc, [decoration])
      )
    }
  }
  static fromNodeRange(range: NodeRange) {
    return EditRange.new(range.start, range.end - range.start, range.$from.doc)
  }
  static fromSelection(selection: Selection) {
    return EditRange.new(
      selection.from,
      selection.to - selection.from,
      selection.$anchor.doc
    )
  }

  map(mapping: Mapping, doc: Node) {
    if (this.length === 0) {
      return this
    } else {
      const decorations = this.decorations.map(mapping, doc)
      const decoration = decorations.find()[0]
      if (!decoration) {
        return EditRange.empty
      } else {
        const { from, to } = decoration
        const length = to - from
        if (this.index !== from || this.length !== length) {
          return new EditRange(from, length, decorations)
        } else {
          return this
        }
      }
    }
  }
  patch({ index, length }: Range, doc: Node) {
    if (this.index === index && this.length === length) {
      return this
    } else {
      return EditRange.new(index, length, doc)
    }
  }
  includesSelection({ from, to }: Selection): boolean {
    const { index, length } = this
    return from >= index && index + length >= to
  }
  excludes({ index, length }: Range): boolean {
    return this.index > index + length || index > this.index + this.length
  }
  includes({ index, length }: Range): boolean {
    if (this.length === 0) {
      return false
    } else {
      return index >= this.index && this.index + this.length >= index + length
    }
  }
  editBlock(doc: Node) {
    return nodePosition(
      isEditBlock,
      doc.resolve(this.index + Math.min(this.length, 1))
    )
  }
  editRange(doc: Node): NodeRange {
    const start = doc.resolve(this.index)
    const end =
      this.length === 0 ? start : doc.resolve(this.index + this.length)
    return new NodeRange(start, end, start.depth)
  }
  sliceFrom(node: Node): Slice {
    return node.slice(this.index, this.index + this.length)
  }
  fragmentFrom(node: Node): Fragment {
    return node.slice(this.index, this.index + this.length).content
  }
}

export const editableRange = (selection: Selection): EditRange => {
  // 1. First find an editable block
  // 2. If editable block is a link, hr, image, then just use it as edit range.
  // 3. If editable block is a paragaraph then find markupRange range with-in it.
  const { $anchor, $head, node } = selection
  if (node && isEditBlock(node)) {
    return EditRange.new($anchor.pos, node.nodeSize, $anchor.doc)
  } else {
    const { doc } = $anchor
    const block = nodePosition(isEditBlock, $anchor)
    if (block) {
      const { nodes } = block.node.type.schema
      switch (block.node.type) {
        case nodes.author:
        // case nodes.heading:
        case nodes.title:
        case nodes.paragraph: {
          const target = nodePosition(isEditNode, $anchor)
          if (target) {
            return EditRange.new(target.index, target.node.nodeSize, doc)
          } else {
            const [start, end] = findMarkupRange($anchor)
            if ($head.pos !== $anchor.pos) {
              const [from, to] = findMarkupRange($head)
              if (from !== start || to !== end) {
                return EditRange.empty
              }
            }
            return EditRange.new(start, end - start, doc)
          }
        }
        default: {
          return EditRange.new(block.index, block.node.nodeSize, doc)
        }
      }
    } else {
      return EditRange.empty
    }
  }
}

export const isEditNode = (node: Node): boolean => {
  const { nodes } = node.type.schema
  switch (node.type) {
    case nodes.link:
      return true
    default:
      return false
  }
}

export const isEditBlock = (node: Node): boolean => {
  const { nodes } = node.type.schema
  switch (node.type) {
    case nodes.expandedImage:
    case nodes.expandedHorizontalRule:
    case nodes.expandedImage:
    case nodes.expandedHorizontalRule:
    case nodes.intro:
    case nodes.paragraph:
    case nodes.heading:
    case nodes.horizontal_rule:
    case nodes.image:
    case nodes.title:
    case nodes.author:
      return true
    default:
      return false
  }
}

export { expandRange, collapseRange }

export const updateRange = (range: EditRange, tr: Transaction): Transaction => {
  const block = range.editBlock(tr.doc)
  if (!block) {
    return tr
  }

  const changeList = ChangeList.new(block.index, tr)
  // 1. First we expand block so we can capture cursor position so we can
  // restore it.
  const tr2 = expandNode(block.node, changeList).toTransaction()
  const block2 = editableRange(tr2.selection).editBlock(tr2.doc)
  if (!block2) {
    return tr
  }

  // 2. Then we serialize expanded block & then parse it as markdown. And abort
  // unless original markup and resulting markup match up.
  const { index, node } = block2
  const markup = Serializer.serialize(node)
  const content = node.isBlock
    ? Parser.parse(markup)
    : Parser.parseInline(markup)
  const output = content.firstChild && createFrom(node.type, content.firstChild)
  // If output is missing, which should never be the case, but if it does it's
  // better to just keep whatever user typed unchanged).
  if (!output) {
    return tr
  }

  // If parsed output does not serialize to the original markup then something
  // is wrong with serializer or parser, most likely parser does some normalization
  // like trimming white-spaces in which cases we abort as we won't be able to
  // recover cursor position correctly.
  const result = Serializer.serialize(content)
  if (result !== markup) {
    return tr
  }

  switch (result) {
    case "":
    case "-":
    case "`":
    case "#":
    case "*":
      return tr
  }

  // 3. If we got this far we capture current cursor position. So we can restore
  // it later. Then we replace original block with a new parsed block. If cursor
  // position can't be capturer abort.
  const offset = textOffsetFromPosition(tr2.doc, tr2.selection.from)
  if (!offset) return tr
  const tr3 = tr.replaceWith(index, index + node.nodeSize, output)

  // 4. Now we expand new node to get to the same textContent as in step 1.
  const tr4 = expandNode(output, ChangeList.new(index, tr3)).toTransaction()

  // If expanded nodes are equal this change is noop so we just abort.
  // const before = tr2.doc.nodeAt(index)
  // const after = tr4.doc.nodeAt(index)
  // if (before && after && before.eq(after)) {
  //   return null
  // }

  // 5. Finally restore position from the text content. If unable to abort,
  // otherwise restore selection.
  const position = positionFromTextOffset(tr4.doc, offset)
  if (!position) return tr
  const tr5 = tr4.setSelection(TextSelection.create(tr4.doc, position))

  // 6. Figure out what should new editRange. If it's empty than we can just
  // collapes whole node. Otherwise ....
  const range6 = editableRange(tr5.selection)
  const node6 = tr5.doc.nodeAt(index)
  if (node6 == null) {
    return tr
  }

  if (range6.length === 0) {
    const tr6 = collapseNode(node6, ChangeList.new(index, tr5)).toTransaction()
    return tr6
  } else {
    const block = range6.editBlock(tr5.doc)
    if (!block) {
      return tr
    }

    const start = range6.index + range6.length
    const end = block.index + block.node.nodeSize - 1
    const tr6 =
      start < end
        ? collapseFragment(
            tr5.doc.slice(start, end).content,
            ChangeList.new(start, tr5)
          ).toTransaction()
        : tr5

    const tr7 =
      index + 1 < range6.index
        ? collapseFragment(
            tr6.doc.slice(index + 1, range6.index).content,
            ChangeList.new(index + 1, tr6)
          ).toTransaction()
        : tr6

    return tr7
  }
}
