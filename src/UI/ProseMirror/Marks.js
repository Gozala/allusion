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
  const markers = []
  const { parent, pos, nodeBefore, nodeAfter } = at
  const index = at.index()
  const marksAt = at.marks()
  const marksBefore = nodeBefore ? nodeBefore.marks : Mark.none
  const marksAfter = nodeAfter ? nodeAfter.marks : Mark.none
  const marks = new Set()
  for (const mark of [...marksAt, ...marksBefore, ...marksAfter]) {
    const markup = mark.attrs.markup || ""
    if (markup != "") {
      marks.add(markup)
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
  marks: string[]
): number => {
  const { parent, pos, textOffset } = position
  let offset = pos - textOffset
  let childIndex = position.index() - 1
  let markIndex = marks.length

  let child = childIndex >= 0 ? parent.child(childIndex) : null
  let mark = marks[--markIndex]

  while (child && mark) {
    if (child.marks.some($ => $.attrs.markup === mark || isMarkup($))) {
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
  marks: string[]
): number => {
  const { parent, pos, textOffset } = position
  let offset = pos - textOffset
  let childIndex = position.index()
  const { childCount } = parent
  let markIndex = marks.length

  let child = childIndex < childCount ? parent.child(childIndex) : null
  let mark = marks[--markIndex]

  while (child && mark) {
    if (child.marks.some($ => $.attrs.markup === mark || isMarkup($))) {
      offset = offset + child.nodeSize
      child = ++childIndex < childCount ? parent.child(childIndex) : null
    } else {
      mark = markIndex > 0 ? marks[--markIndex] : null
    }
  }

  return offset
}

const isMarkup = (mark: Mark) => {
  const { group } = mark.type.spec
  return group && group.includes("markup")
}
