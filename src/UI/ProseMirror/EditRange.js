// @flow strict

import type { Transaction } from "prosemirror-state"
import type { Mark, Node, Schema } from "prosemirror-model"
import { Decoration, DecorationSet } from "prosemirror-view"
import { getSelectionMarkers } from "./Marks"
import { Selection } from "prosemirror-state"
import { Fragment, Slice } from "prosemirror-model"
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
  range: Range,
  schema: Schema
): Transaction => {
  return collapse(tr, range, schema)
}

export const beginEdit = (
  tr: Transaction,
  range: Range,
  schema: Schema
): Transaction => {
  return expand(range, tr, schema)
}

class ChangeList {
  tr: Transaction
  index: number
  format: Mark[]
  schema: Schema
  storedMarks: Map<string, boolean>
  constructor(
    index: number,
    tr: Transaction,
    schema: Schema,
    format: Mark[],
    storedMarks: Map<string, boolean>
  ) {
    this.index = index
    this.format = format
    this.schema = schema
    this.tr = tr
    this.storedMarks = storedMarks
  }
  updateMarks(marks: Mark[]) {
    const newMarks = new Map()
    const { storedMarks } = this

    for (let mark of marks) {
      const markup: string = mark.attrs["markup"] || ""
      if (markup != "") {
        newMarks.set(markup, true)
      }
    }

    for (let mark of storedMarks.keys()) {
      if (newMarks.has(mark)) {
        newMarks.delete(mark)
      } else {
        storedMarks.delete(mark)
        this.insertMarkup(mark)
        console.log("--", mark)
      }
    }

    for (const mark of newMarks.keys()) {
      storedMarks.set(mark, true)
      this.insertMarkup(mark)
      console.log("++", mark)
    }

    return this
  }
  removeMark(mark: string) {}
  insertMarkup(markup: string) {
    this.insertNode(this.schema.text(markup, this.format))
    return this
  }
  insertNode(node: Node) {
    this.tr = this.tr.insert(this.index, node)
    console.log(`+${node.toString()}@${this.index}`)
    this.index += node.nodeSize
    return this
  }
  retainNode(node: Node) {
    this.index += node.nodeSize
    return this
  }
  markupNode(markup: string, node: Node) {
    this.index += 1
    this.insertMarkup(markup)
    this.index += node.nodeSize - 1
    this.retainNode(node)
    return this
  }
  deleteNode(node: Node) {
    this.tr = this.tr.delete(this.index, this.index + node.nodeSize)
    console.log(`-${node.toString()}@${this.index}`)
    return this
  }
}

export const expand = (
  range: Range,
  transaction: Transaction,
  schema: Schema
): Transaction => {
  const { selection, doc } = transaction
  const { content } = doc.slice(range.index, range.index + range.length)
  const changeList = new ChangeList(
    range.index,
    transaction,
    schema,
    [schema.mark("markup")],
    new Map()
  )

  const count = content.childCount
  let index = 0

  while (index < count) {
    const node = content.child(index)
    changeList.updateMarks(node.marks)

    switch (node.type) {
      case schema.nodes.anchor: {
        changeList
          .insertMarkup("[")
          .retainNode(node)
          .insertMarkup("](")

        const title =
          node.attrs.title == null
            ? ""
            : JSON.stringify(String(node.attrs.title))
        changeList
          .insertNode(schema.text(`${node.attrs.href} ${title}`))
          .insertMarkup(")")

        break
      }
      case schema.nodes.heading: {
        const level: number = node.attrs.level || 1
        changeList.markupNode(`${"#".repeat(level)} `, node)
        break
      }
      // case schema.nodes.horizontal_rule: {
      //   changeList.markupNode("---", node)
      //   break
      // }
      case schema.nodes.image: {
        changeList
          .insertMarkup("![")
          .insertNode(schema.text(node.attrs.alt))
          .insertMarkup("](")

        const title =
          node.attrs.title == null
            ? ""
            : JSON.stringify(String(node.attrs.title))

        changeList
          .insertNode(schema.text(`${node.attrs.src} ${title}`))
          .insertMarkup(")")
          .retainNode(node)

        break
      }
      default: {
        changeList.retainNode(node)
        break
      }
    }
    index++
  }

  return changeList.updateMarks([]).tr
}

export const collapse = (
  transaction: Transaction,
  range: Range,
  schema: Schema
): Transaction => {
  const { selection, doc } = transaction
  const { content } = doc.slice(range.index, range.index + range.length)
  const changeList = new ChangeList(
    range.index,
    transaction,
    schema,
    [schema.mark("markup")],
    new Map()
  )

  let index = 0
  const count = content.childCount
  while (index < count) {
    const node = content.child(index)
    const marks = node.marks
    if (marks.some($ => $.type.name === "markup")) {
      changeList.deleteNode(node)
    } else {
      changeList.retainNode(node)
    }

    index += 1
  }
  return changeList.tr
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
