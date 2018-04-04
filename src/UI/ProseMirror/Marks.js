// @flow strict

import type { Transaction, Selection } from "prosemirror-state"
import type { MarkType, ResolvedPos, Node, Fragment } from "prosemirror-model"
import { Decoration, DecorationSet } from "prosemirror-view"
import { Mark } from "prosemirror-model"
import { nodePosition, resolvePosition } from "./Position"

export type Marker = {
  mark: Mark,
  start: number,
  end: number
}

export const getMarkupMarksAround = (at: ResolvedPos): string[] => {
  const { parent, pos, nodeBefore, nodeAfter } = at
  const index = at.index()

  // const nodeBefore = getNodeBefore(at)
  // const nodeAfter = getNodeAfter(at)
  const marks = [
    ...at.marks(),
    ...(nodeBefore ? nodeBefore.marks : Mark.none),
    ...(nodeAfter ? nodeAfter.marks : Mark.none)
  ]

  const markMarkup = new Set()
  for (const mark of marks) {
    const markup: string = mark.attrs.markup || ""
    if (markup != "") {
      markMarkup.add(markup)
    }

    const marks = mark.attrs.marks || ""
    if (marks != "") {
      for (const markup of marks.split(" ")) {
        markMarkup.add(markup)
      }
    }
  }
  return [...markMarkup]
}

export const getMarkup = (node: Node): string[] => {
  let result = new Set()
  const marks = node.marks
  for (const mark of marks) {
    const markup: string = mark.attrs.markup || ""
    if (markup != "") {
      result.add(markup)
    }

    const marks = mark.attrs.marks || ""
    if (marks != "") {
      for (const markup of marks.split(" ")) {
        result.add(markup)
      }
    }
  }
  return [...result]
}

export const findMarkupRange = (position: ResolvedPos): [number, number] => {
  const marks = getMarkupMarksAround(position)
  return [
    findMarkupRangeStart(position, marks),
    findMarkupRangeEnd(position, marks)
  ]
}

export const findMarkupBoundry = (
  anchor: ResolvedPos,
  marks: string[],
  dir: -1 | 1
): number => {
  let offset = anchor.pos
  let { depth, textOffset } = anchor
  let n = marks.length

  while (depth >= 0) {
    const node = anchor.node(depth)
    if (isEditNode(node)) {
      offset = dir > 0 ? anchor.after(depth) : anchor.start(depth) + dir
    } else {
      const { childCount } = node
      let mark = marks[--n]
      if (mark) {
        offset = offset === anchor.pos ? offset - textOffset : offset
        // If walking left then we want to jump to the start of the node under given
        // position so we decrement index and subtract textOffset. If we are walking
        // right we still subtract textOffset but use unmodified index to consider
        // this node as well.
        let index =
          anchor.index(depth) + (depth === anchor.depth && dir > 0 ? 0 : dir)

        while (index >= 0 && index < childCount && mark != null) {
          const child = node.child(index)
          if (isMarkedWith(child, mark)) {
            const size = child.isText ? child.nodeSize : child.nodeSize
            offset += dir * size
            index += dir
          } else {
            mark = n > 0 ? marks[--n] : null
          }
        }
      }
      // Only get parents as long as we it's an editNode
      depth = 0
    }

    depth--
  }

  return offset
}

export const findBoundry = (anchor: ResolvedPos, dir: -1 | 1) => {
  let offset = anchor.pos

  const next = dir > 0 ? anchor.nodeAfter : anchor.nodeBefore
  if (next && isEditNode(next)) {
    offset += dir * next.nodeSize
  }
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
    node = root.nodeAt(offset + dir)
  }
  return offset
}

export const findMarkedBoundry = (
  marks: string[],
  index: number,
  anchor: Node,
  dir: -1 | 1,
  root: Node
): number => {
  let offset = index
  const size = root.content.size
  let n = marks.length
  let mark = marks[--n]
  let node = anchor
  while (node && mark) {
    if (isMarkedWith(node, mark)) {
      offset += dir * node.nodeSize

      const next = dir < 0 ? offset + dir : offset
      node = next > 0 && next < size ? root.nodeAt(next) : null
    } else {
      mark = marks[--n]
    }
  }
  return offset
}

export const findEditBoundry = (
  isIncluded: Node => boolean,
  index: number,
  anchor: Node,
  dir: -1 | 1,
  root: Node
): number => {
  let offset = findNodeBoundry(isEditNode, index, anchor, dir, root)
  let node = index === offset ? anchor : root.nodeAt(offset)
  return node == null
    ? offset
    : findMarkedBoundry(getMarkup(anchor), offset, node, dir, root)
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

// export const geMarks = (anchor: ResolvedPos): string[] => {
//   const { parent, pos, nodeBefore, nodeAfter } = anchor
//   const index = anchor.index()

//   // const nodeBefore = getNodeBefore(at)
//   // const nodeAfter = getNodeAfter(at)
//   const marks = [
//     ...anchor.marks(),
//     ...(nodeBefore ? nodeBefore.marks : Mark.none),
//     ...(nodeAfter ? nodeAfter.marks : Mark.none)
//   ]

//   const markMarkup = new Set()
//   for (const mark of marks) {
//     const markup: string = mark.attrs.markup || ""
//     if (markup != "") {
//       markMarkup.add(markup)
//     }

//     const marks = mark.attrs.marks || ""
//     if (marks != "") {
//       for (const markup of marks.split(" ")) {
//         markMarkup.add(markup)
//       }
//     }
//   }
//   return [...markMarkup]
// }

const getNodeBoundry = (anchor: ResolvedPos, dir: -1 | 1): number => {
  const { pos, parent, textOffset } = anchor
  if (dir > 0) {
    return pos - textOffset
  } else {
    const index = anchor.index()
    if (index < parent.childCount) {
      return pos - textOffset + parent.child(index).nodeSize
    } else {
      return pos
    }
  }
}

export const isMarkedWith = (node: Node, mark: string): boolean =>
  isNodeMarkedWith(node, mark) || isInlineNodeContentMarkedWith(node, mark)

const isNodeMarkedWith = (node: Node, mark: string): boolean =>
  node.marks.some(
    ({ attrs: { markup, marks } }) =>
      markup === mark || icludesMark(marks, mark)
  )

// prose-mirror bug https://github.com/ProseMirror/prosemirror/issues/780 causes
// marked links to get unmarked moving those marks down into it's content. In
// order to avoid incorrect behavior we check all of the node content, if all of
// it is marked we treat it as marked node.
const isInlineNodeContentMarkedWith = (node: Node, mark: string): boolean =>
  !node.isText && node.isInline && isFragmentMarkedWith(node.content, mark)

const isFragmentMarkedWith = (fragment: Fragment, mark: string): boolean =>
  fragment.content.every(node => isMarkedWith(node, mark))

const icludesMark = (marks, mark) => `${marks} `.includes(`${mark} `)

export const findMarkupRangeStart = (
  position: ResolvedPos,
  marks: string[]
): number => findMarkupBoundry(position, marks, -1)

export const findMarkupRangeEnd = (
  position: ResolvedPos,
  marks: string[]
): number => findMarkupBoundry(position, marks, 1)

export const isMarkup = (mark: Mark) => {
  const { group } = mark.type.spec
  return group && group.includes("markup")
}

export const isntMarkup = (mark: Mark) => !isMarkup(mark)

export const isMarkupNode = (node: Node) => node.marks.some(isMarkup)

export const isntMarkupNode = (node: Node): boolean =>
  !node.marks.some(isMarkup)

export const isEditNode = (node: Node): boolean => {
  const { nodes } = node.type.schema
  switch (node.type) {
    case nodes.link:
      return true
    default:
      return false
  }
}
