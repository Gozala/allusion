// @flow strict

import type { Transaction, Selection } from "prosemirror-state"
import type { MarkType, ResolvedPos, Node } from "prosemirror-model"
import { Decoration, DecorationSet } from "prosemirror-view"
import { Mark } from "prosemirror-model"

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

// export const findNode = (
//   at: ResolvedPos,
//   is: Node => boolean,
//   dir: -1 | 1
// ): ?Node => {
//   const node = dir > 0 ? at.nodeAfter : at.nodeBefore
//   if (node != null && is(node)) {
//     return node
//   } else {
//     const { parent } = at
//     const { childCount } = parent
//     let index = at.index() + dir
//     while (index >= 0 && index < childCount) {
//       const node = parent.child(index)
//       if (is(node)) {
//         return node
//       } else {
//         index += dir
//       }
//     }
//     return null
//   }
// }

// export const getNodeBefore = (at: ResolvedPos): ?Node =>
//   findNode(at, () => true, -1)

// export const getNodeAfter = (at: ResolvedPos): ?Node =>
//   findNode(at, () => true, 1)

export const findMarkupRange = (position: ResolvedPos): [number, number] => {
  const marks = getMarkupMarksAround(position)
  return [
    findMarkupRangeStart(position, marks),
    findMarkupRangeEnd(position, marks)
  ]
}

export const findMarkupBoundry = (
  position: ResolvedPos,
  marks: string[],
  dir: -1 | 1
): number => {
  const { parent, pos, textOffset } = position
  const { childCount } = parent

  // If walking left then we want to jump to the start of the node under given
  // position so we decrement index and subtract textOffset. If we are walking
  // right we still subtract textOffset but use unmodified index to consider
  // this node as well.
  let childIndex = dir < 0 ? position.index() + dir : position.index()
  let offset = pos - textOffset
  let markIndex = marks.length
  let mark = marks[--markIndex]
  while (childIndex >= 0 && childIndex < childCount && mark != null) {
    const child = parent.child(childIndex)
    const markup = mark
    if (isMarkedWith(child, markup)) {
      offset = dir < 0 ? offset - child.nodeSize : offset + child.nodeSize
      childIndex += dir
    } else {
      mark = markIndex > 0 ? marks[--markIndex] : null
    }
  }
  return offset
}

export const isMarkedWith = (node: Node, mark: string): boolean =>
  node.marks.some(
    ({ attrs: { markup, marks } }) =>
      markup === mark || icludesMark(marks, mark)
  )

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
