// @flow strict

import type {
  Transaction,
  MarkType,
  Selection,
  ResolvedPos,
  Mark,
  Node
} from "prosemirror-state"
import { Decoration, DecorationSet } from "prosemirror-view"

type Marker = {
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

const findMarkStart = (
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

const findMarkEnd = (
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

export const decorateMarker = (marker: Marker) =>
  decorate(marker.start, marker.end)

export const decorate = (
  start: number,
  end: number,
  attributes: { [string]: string } = { nodeName: "u" }
) => Decoration.inline(start, end, attributes)
