// @flow strict

import type { Transaction } from "prosemirror-state"
import type { Mark, Node, Schema } from "prosemirror-model"
import { Decoration, DecorationSet } from "prosemirror-view"
import { getSelectionMarkers } from "./Marks"
import { Selection } from "prosemirror-state"
import { Fragment } from "prosemirror-model"
import Parser from "../Allusion/Parser"
import Serializer from "../Allusion/Serializer"

export class Range {
  +index: number
  +length: number
  constructor(index: number, length: number) {
    this.index = index
    this.length = length
  }
  static fromNodeRange({ start, end }: { start: number, end: number }) {
    return new Range(start, end - start)
  }
  static fromSelection({ from, to }: { from: number, to: number }) {
    return new Range(from, to - from)
  }
}

export const editableRange = (selection: Selection): Range => {
  const { $cursor, node } = selection

  if ($cursor) {
    const node = $cursor.node()
    switch (node.type.name) {
      case "heading":
      case "anchor": {
        return Range.fromNodeRange($cursor.blockRange())
      }
    }
  }

  if (node) {
    switch (node.type.name) {
      case "image":
      case "horizontal_rule": {
        return Range.fromSelection(selection)
      }
    }
  }

  return markedRange(selection)
}

export const markedRange = (selection: Selection): Range => {
  const markers = getSelectionMarkers(selection)
  let length = 0
  let index = Infinity
  for (let marker of markers) {
    if (length === 0) {
      index = marker.start
      length = marker.end - marker.start
    } else {
      index = Math.min(marker.start, index)
      length = Math.max(marker.end - index, length)
    }
  }
  return new Range(index, length)
}

export const endEdit = (
  tr: Transaction,
  { index, length }: Range,
  schema: Schema
): Transaction => {
  const end = index + length
  const slice = tr.doc.slice(index, end)
  // const fragment = collapse(slice.content, schema)
  const markup = tr.doc.textBetween(index, end)
  const fragment = Parser.parseInline(markup)
  if (slice.content.eq(fragment)) {
    return tr
  } else {
    return tr.replaceRangeWith(index, end, fragment)
  }
}

export const beginEdit = (
  tr: Transaction,
  { index, length }: Range,
  schema: Schema
): Transaction => {
  const end = index + length
  const slice = tr.doc.slice(index, end)
  // const markup = Serializer.serializeInline(slice.content)
  // return tr.replaceRangeWith(start, end, Parser.schema.text(markup))

  return tr.replaceRangeWith(index, end, expand(slice.content, schema))
}

export const expand = (content: Fragment, schema: Schema): Fragment =>
  Fragment.fromArray(expandInto([], content, schema))

const expandInto = (
  nodes: Node[],
  content: Fragment,
  schema: Schema
): Node[] => {
  let index = 0
  let offset = 0
  const count = content.childCount
  const openMarks = new Map()

  const formatting = [schema.mark("formatting")]
  while (index < count) {
    const node = content.child(index)
    const marks = node.marks
    for (let mark of marks) {
      const marker: ?string = mark.attrs["data-prefix"] || null
      if (marker != null) {
        if (!openMarks.has(marker)) {
          nodes.push(schema.text(marker, formatting))
        }
        openMarks.set(marker, index)
      }
    }

    offset = nodes.length
    switch (node.type) {
      case schema.nodes.anchor: {
        nodes.push(schema.text("[", formatting))
        expandInto(nodes, node.content, schema)
        nodes.push(schema.text("](", formatting))
        const title =
          node.attrs.title == null
            ? ""
            : JSON.stringify(String(node.attrs.title))
        nodes.push(schema.text(`${node.attrs.href} ${title}`))
        nodes.push(schema.text(")", formatting))
        break
      }
      case schema.nodes.heading: {
        const level: number = node.attrs.level || 1
        nodes.push(
          schema.node(
            schema.nodes.heading,
            { level: node.attrs.level, expand: true },
            Fragment.from(
              schema.text(`${"#".repeat(level)} `, formatting)
            ).append(node.content)
          )
        )
        break
      }
      case schema.nodes.horizontal_rule: {
        nodes.push(schema.text("---", formatting))
        break
      }
      case schema.nodes.image: {
        nodes.push(schema.text("![", formatting))
        nodes.push(schema.text(node.attrs.alt))
        nodes.push(schema.text("](", formatting))
        const title =
          node.attrs.title == null
            ? ""
            : JSON.stringify(String(node.attrs.title))
        nodes.push(schema.text(`${node.attrs.src} ${title}`))
        nodes.push(schema.text(")", formatting))
        break
      }
      default: {
        nodes.push(node)
        break
      }
    }

    for (const [marker, value] of openMarks.entries()) {
      if (value != index) {
        openMarks.delete(marker)
        nodes.splice(offset++, 0, schema.text(marker, formatting))
      }
    }

    index++
  }

  for (const marker of openMarks.keys()) {
    nodes.push(schema.text(marker, formatting))
  }

  return nodes
}

export const collapse = (content: Fragment, schema: Schema): Fragment =>
  Fragment.fromArray(collapseInto([], content, schema))

export const collapseInto = (
  nodes: Node[],
  content: Fragment,
  schema: Schema
): Node[] => {
  let index = 0
  let offset = 0
  const count = content.childCount
  const openMarks = new Map()

  const formatting = [schema.mark("formatting")]
  while (index < count) {
    const node = content.child(index)
    const marks = node.marks
  }
  return nodes
}

export const editOffRange = (
  tr: Transaction,
  selection: Selection
): ?Transaction => {
  const { $cursor } = selection
  if ($cursor) {
    const { start, end } = $cursor.blockRange()
    const slice = tr.doc.slice(start, end)
    if (slice.size === 0) {
      return null
    }
    const markup = Serializer.serializeInline(slice.content)
    const content = Parser.parseInline(markup)
    if (slice.content.eq(content)) {
      return null
    } else {
      return tr.replaceRangeWith(start, end, content)
    }
  } else {
    return null
  }
}
