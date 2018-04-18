// @flow strict

import type { Transaction, Selection } from "prosemirror-state"
import type { MarkType, ResolvedPos, Node, Fragment } from "prosemirror-model"
import { Decoration, DecorationSet } from "prosemirror-view"
import { Mark } from "prosemirror-model"
import { nodePosition, resolvePosition } from "./Position"
import { EditNode } from "./Schema"
import { nodeBy } from "./Node"

export const isEditNode = EditNode.is

export const getMarks = (node: Node): Mark[] => {
  let marks = node.marks
  for (const mark of marks) {
    const markupMarks = mark.attrs.marks
    if (markupMarks) {
      for (const mark of markupMarks) {
        marks = mark.addToSet(marks)
      }
    }
  }
  return marks
}

export const findNodeBoundry = (
  isIncluded: Node => boolean,
  index: number,
  anchor: Node,
  dir: -1 | 1,
  root: Node
): number => {
  let offset = index
  let node = anchor
  while (node && isIncluded(node)) {
    offset += dir * node.nodeSize
    node = root.nodeAt(dir > 0 ? offset : offset + dir)
  }
  return offset
}

export const findMarkedBoundry = (
  marks: Mark[],
  position: number,
  anchor: Node,
  dir: -1 | 1,
  root: Node
): number => {
  let boundry = position
  const size = root.content.size
  let n = marks.length
  let mark = marks[--n]
  let node = anchor
  let offset = boundry
  while (node && mark) {
    if (isMarkedWith(node, mark)) {
      boundry = dir < 0 ? offset : offset + node.nodeSize

      void ({ offset, node } = nodeBy(root, boundry, dir))
    } else {
      mark = marks[--n]
    }
  }
  return boundry
}

export const findEditBoundry = (
  isIncluded: Node => boolean,
  index: number,
  anchor: Node,
  dir: -1 | 1,
  root: Node
): number => {
  let offset = findNodeBoundry(isIncluded, index, anchor, dir, root)
  let node = index === offset ? anchor : root.nodeAt(offset)
  return node == null
    ? offset
    : findMarkedBoundry(getMarks(anchor), offset, node, dir, root)
}

export const findEditRange = (
  anchor: ResolvedPos,
  isIncluded: Node => boolean = isEditNode
): [number, number] => {
  const root = anchor.doc
  const { pos, nodeBefore, nodeAfter } = resolvePosition(isIncluded, anchor)

  const start =
    nodeBefore == null
      ? pos
      : findEditBoundry(isIncluded, pos, nodeBefore, -1, root)

  const end =
    nodeAfter == null
      ? pos
      : findEditBoundry(isIncluded, pos, nodeAfter, 1, root)

  return [start, end]
}

export const isMarkedWith = (node: Node, mark: Mark): boolean =>
  isNodeMarkedWith(node, mark) || isInlineNodeContentMarkedWith(node, mark)

const isNodeMarkedWith = (node: Node, mark: Mark): boolean => {
  for (const nodeMark of node.marks) {
    if (nodeMark.eq(mark)) {
      return true
    }
    const { marks } = nodeMark.attrs
    if (marks && mark.isInSet(marks)) {
      return true
    }
  }
  return false
}

// prose-mirror bug https://github.com/ProseMirror/prosemirror/issues/780 causes
// marked links to get unmarked moving those marks down into it's content. In
// order to avoid incorrect behavior we check all of the node content, if all of
// it is marked we treat it as marked node.
const isInlineNodeContentMarkedWith = (node: Node, mark: Mark): boolean =>
  !node.isText && node.isInline && isFragmentMarkedWith(node.content, mark)

const isFragmentMarkedWith = (fragment: Fragment, mark: Mark): boolean =>
  fragment.content.every(node => isMarkedWith(node, mark))

const icludesMark = (marks, mark) => `${marks} `.includes(`${mark} `)

export const isMarkup = (mark: Mark) => {
  const { group } = mark.type.spec
  return group && group.includes("markup")
}
