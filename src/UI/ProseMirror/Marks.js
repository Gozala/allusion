// @flow strict

import type { Transaction, Selection } from "prosemirror-state"
import type { MarkType, ResolvedPos, Mark, Node } from "prosemirror-model"
import { Decoration, DecorationSet } from "prosemirror-view"

export type Marker = {
  mark: Mark,
  start: number,
  end: number
}

export const getSelectionMarkers = (selection: Selection): Marker[] => {
  const { $cursor, $from, $to } = selection
  if ($cursor) {
    return getMarkersAt($cursor)
  } else {
    return getMarkersInRange($from, $to)
  }
}

export const getMarkersInRange = (
  from: ResolvedPos,
  to: ResolvedPos
): Marker[] => {
  const markers = []
  return markers
}

const empty = []
export const getMarkersAt = (at: ResolvedPos): Marker[] => {
  const markers = []
  const { parent, pos, nodeBefore, nodeAfter } = at
  const index = at.index()
  const marksUnder = at.marks()
  const marksBefore = nodeBefore ? nodeBefore.marks : empty
  const marksAfter = nodeAfter ? nodeAfter.marks : empty
  const marks = new Set([...marksUnder, ...marksBefore, ...marksAfter])
  for (const mark of marks) {
    const start = findMarkStart(parent, pos - at.textOffset, index, mark)
    const end = findMarkEnd(parent, pos - at.textOffset, index, mark)
    markers.push({ start, end, mark })
  }

  return markers
}

export const getMarkupMarksAround = (at: ResolvedPos): Mark[] => {
  const markers = []
  const { parent, pos, nodeBefore, nodeAfter } = at
  const index = at.index()
  const marksAt = at.marks()
  const marksBefore = nodeBefore ? nodeBefore.marks : empty
  const marksAfter = nodeAfter ? nodeAfter.marks : empty
  const marks = new Set()
  for (const mark of [...marksAt, ...marksBefore, ...marksAfter]) {
    if (mark.attrs.markup != null) {
      marks.add(mark)
    }
  }
  return [...marks]
}

export const findMarkupRange = (position: ResolvedPos): [number, number] => {
  const marks = getMarkupMarksAround(position)
  return [
    findMarkupRangeStart(position, marks),
    findMarkupRangeEnd(position, marks)
  ]
}

export const findMarkupRangeStart = (
  position: ResolvedPos,
  marks: Mark[]
): number => {
  const { parent, pos, textOffset } = position
  let offset = pos - textOffset
  let childIndex = position.index() - 1
  let markIndex = marks.length

  let child = childIndex > 0 ? parent.child(childIndex) : null
  let mark = marks[--markIndex]

  while (child && mark) {
    if (child.marks.includes(mark)) {
      offset = offset - child.nodeSize
      child = childIndex > 0 ? parent.child(--childIndex) : null
    } else {
      mark = markIndex > 0 ? marks[--markIndex] : null
    }
  }

  return offset
}

export const findMarkupRangeEnd = (
  position: ResolvedPos,
  marks: Mark[]
): number => {
  const { parent, pos, textOffset } = position
  let offset = pos - textOffset
  let childIndex = position.index()
  const { childCount } = parent
  let markIndex = marks.length

  let child = childIndex < childCount ? parent.child(childIndex) : null
  let mark = marks[--markIndex]

  while (child && mark) {
    if (child.marks.includes(mark)) {
      offset = offset + child.nodeSize
      child = ++childIndex < childCount ? parent.child(childIndex) : null
    } else {
      mark = markIndex > 0 ? marks[--markIndex] : null
    }
  }

  return offset
}

export const findMarkStart = (
  node: Node,
  pos: number,
  index: number,
  mark: Mark
): number => {
  let n = index - 1
  let offset = pos
  while (n >= 0) {
    let target = node.child(n--)
    if (target && target.marks.includes(mark)) {
      offset = offset - target.nodeSize
    } else {
      break
    }
  }
  return offset
}

export const findMarkEnd = (
  node: Node,
  pos: number,
  index: number,
  mark: Mark
): number => {
  const count = node.childCount
  let n = index
  let offset = pos
  while (n < count) {
    let target = node.child(n++)
    if (target && target.marks.includes(mark)) {
      offset = offset + target.nodeSize
    } else {
      break
    }
  }
  return offset
}
