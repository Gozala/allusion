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
  const { selection, doc } = tr
  const { content } = doc.slice(range.index, range.index + range.length)
  const changeList = new ChangeList(range.index, tr, schema, new Map())

  return collapse(content, changeList, schema).tr
}

export const beginEdit = (
  tr: Transaction,
  range: Range,
  schema: Schema
): Transaction => {
  const { selection, doc } = tr
  const { content } = doc.slice(range.index, range.index + range.length)
  const changeList = new ChangeList(range.index, tr, schema, new Map())

  return expand(content, changeList, schema).updateMarks([]).tr
}

class ChangeList {
  tr: Transaction
  index: number
  schema: Schema
  storedMarks: Map<string, Mark>
  markup: Mark
  meta: Mark
  constructor(
    index: number,
    tr: Transaction,
    schema: Schema,
    storedMarks: Map<string, Mark>
  ) {
    this.index = index
    this.schema = schema
    this.tr = tr
    this.storedMarks = storedMarks

    this.markup = schema.mark("markup")
    this.meta = schema.mark("meta")
  }
  updateMarks(marks: Mark[]) {
    const newMarks = new Map()
    const { storedMarks } = this

    for (let mark of marks) {
      const markup: string = mark.attrs["markup"] || ""
      if (markup != "") {
        newMarks.set(markup, mark)
      }
    }

    for (let mark of storedMarks.keys()) {
      if (newMarks.has(mark)) {
        newMarks.delete(mark)
      } else {
        storedMarks.delete(mark)
        this.insertMarkupCode(mark, marks)
      }
    }

    for (const [markup, mark] of newMarks.entries()) {
      storedMarks.set(markup, mark)
      this.insertMarkupCode(markup, marks)
    }

    return this
  }
  insertMarkupCode(code: string, marks: Mark[]) {
    const { schema, meta, markup } = this
    this.insertNode(schema.text(code, [meta, markup, ...marks]))
    return this
  }
  insertMarkup(markup: string, marks: Mark[]) {
    this.insertNode(this.schema.text(markup, [this.markup, ...marks]))
    return this
  }
  insertText(text: string, marks: Mark[]) {
    return this.insertNode(this.schema.text(text, marks))
  }
  insertNode(node: Node) {
    this.tr = this.tr.insert(this.index, node)
    this.index += node.nodeSize
    return this
  }
  retainNode(node: Node) {
    this.index += node.nodeSize
    return this
  }
  markupNode(markup: string, node: Node) {
    this.index += 1
    this.insertMarkupCode(markup, node.marks)
    this.index += node.nodeSize - 1
    this.retainNode(node)
    return this
  }
  deleteNode(node: Node) {
    this.tr = this.tr.delete(this.index, this.index + node.nodeSize)
    return this
  }
}

export const expand = (
  content: Fragment,
  changeList: ChangeList,
  schema: Schema
): ChangeList => {
  const count = content.childCount
  let index = 0

  while (index < count) {
    const node = content.child(index)
    changeList.updateMarks(node.marks)

    switch (node.type) {
      case schema.nodes.anchor: {
        // changeList.index++
        changeList.tr.setNodeMarkup(changeList.index, null, {
          href: node.attrs.href,
          title: node.attrs.title,
          mode: "write"
        })
        changeList.index++
        // changeList.index++
        // changeList.insertMarkupCode("[", node.marks)
        // expand(node.content, changeList, schema)
        // changeList.insertMarkupCode("](", node.marks)

        // const title =
        // node.attrs.title == null
        // ? ""
        // : JSON.stringify(String(node.attrs.title))

        // changeList
        // .insertMarkup(`${node.attrs.href} ${title}`, node.marks)
        // .insertMarkupCode(")", node.marks)
        // changeList.index++

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
          .insertMarkupCode("![", node.marks)
          .insertMarkup(node.attrs.alt, node.marks)
          .insertMarkupCode("](", node.marks)

        const title =
          node.attrs.title == null
            ? ""
            : JSON.stringify(String(node.attrs.title))

        changeList
          .insertMarkup(`${node.attrs.src} ${title}`, node.marks)
          .insertMarkupCode(")", node.marks)
          .retainNode(node)

        break
      }
      case schema.nodes.text: {
        changeList.retainNode(node)
        break
      }
      default: {
        changeList.index++
        expand(node.content, changeList, schema)
        // changeList.retainNode(node)
        break
      }
    }
    index++
  }

  return changeList
}

export const collapse = (
  content: Fragment,
  changeList: ChangeList,
  schema: Schema
): ChangeList => {
  let index = 0
  const count = content.childCount
  while (index < count) {
    const node = content.child(index)
    const marks = node.marks
    if (marks.some($ => $.type.name === "markup")) {
      changeList.deleteNode(node)
    } else if (node.type.name === "anchor") {
      changeList.tr.setNodeMarkup(changeList.index, null, {
        href: node.attrs.href,
        title: node.attrs.title,
        mode: "read"
      })
      changeList.index++
    } else {
      if (node.isText) {
        changeList.retainNode(node)
      } else {
        changeList.index++
        collapse(node.content, changeList, schema)
        changeList.index++
      }
    }

    index += 1
  }
  return changeList
}

export const editOffRange = (
  tr: Transaction,
  selection: Selection,
  schema: Schema
): ?Transaction => {
  const { $cursor } = selection
  if ($cursor) {
    const { start, end } = $cursor.blockRange()
    const slice = tr.doc.slice(start, end)
    const source = slice.content.firstChild && slice.content.firstChild.content
    if (!source || source.size === 0) {
      return null
    }

    const markup = Serializer.serializeInline(source)
    const content = Parser.parseInline(markup)

    const changeList = new ChangeList(start + 1, tr, schema, new Map())
    return patch(source, content, changeList, schema)
  } else {
    return null
  }
}
window.editOffRange = editOffRange
window.Serializer = Serializer
window.Parser = Parser

export const patch = (
  last: Fragment,
  next: Fragment,
  changeList: ChangeList,
  schema: Schema
) => {
  const lastCount = last.childCount
  const nextCount = next.childCount
  let lastIndex = 0
  let nextIndex = 0

  while (lastIndex < lastCount) {
    const lastChild = last.child(lastIndex)
    const nextChild = nextIndex < nextCount ? next.child(nextIndex) : null

    if (nextChild != null && lastChild.eq(nextChild)) {
      changeList.retainNode(lastChild)
      lastIndex++
      nextIndex++
    } else {
      changeList.deleteNode(lastChild)
      lastIndex++
    }
  }

  while (nextIndex < nextCount) {
    changeList.insertNode(next.child(nextIndex))
    nextIndex++
  }

  return changeList.tr
}
