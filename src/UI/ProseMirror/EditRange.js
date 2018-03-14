// @flow strict

import type { Transaction } from "prosemirror-state"
import type { Mark, Node, Schema, NodeRange } from "prosemirror-model"
import { getSelectionMarkers, getMarkersAt, type Marker } from "./Marks"
import { Selection } from "prosemirror-state"
import { Fragment, Slice } from "prosemirror-model"
import Parser from "../Allusion/Parser"
import Serializer from "../Allusion/Serializer"
import { Decoration, DecorationSet } from "prosemirror-view"
import type { Mapping } from "prosemirror-transform"

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
  static empty = new EditRange(Infinity, 0, DecorationSet.empty)
  static attributes = { nodeName: "span", class: "edit" }
  static options = {
    inclusiveStart: true,
    inclusiveEnd: true
  }
  static new(index: number, length: number, doc: Node) {
    if (length === 0) {
      return EditRange.empty
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
    if (length === 0) {
      return EditRange.empty
    } else if (this.index === index && this.length === length) {
      return this
    } else {
      return EditRange.new(index, length, doc)
    }
  }
  includesSelection({ from, to }: Selection): boolean {
    const { index, length } = this
    return from >= index && index + length >= to
  }
  includes({ index, length }: Range): boolean {
    if (length === 0) {
      return true
    } else if (this.length === 0) {
      return false
    } else {
      return index >= this.index && this.index + this.length >= index + length
    }
  }
}

export const editableRange = (selection: Selection): EditRange => {
  const { $cursor, node, $anchor } = selection
  const { doc } = $anchor

  if (!$cursor) {
    return EditRange.empty
  } else {
    let depth = $cursor.depth
    const { nodes } = $cursor.parent.type.schema
    while (depth > 0) {
      const node = $cursor.node(depth)
      switch (node.type) {
        case nodes.paragraph:
        case nodes.heading: {
          return EditRange.new(
            $cursor.start(depth) - 1,
            $cursor.end(depth) + 1,
            doc
          )
        }
      }
      depth--
    }
    return EditRange.empty
  }

  // if ($cursor) {
  //   const node = $cursor.node()
  //   switch (node.type.name) {
  //     case "heading":
  //     case "anchor": {
  //       return EditRange.fromNodeRange($cursor.blockRange())
  //     }
  //   }
  // }

  // if (node) {
  //   switch (node.type.name) {
  //     case "image":
  //     case "horizontal_rule": {
  //       return EditRange.fromSelection(selection)
  //     }
  //   }
  // }

  // return markedRange(selection)
}

export const expandRange = (selection: Selection): ?NodeRange => {
  const { $cursor, node, from, $from } = selection
  const target = node || $from.doc.nodeAt($from.pos)
  const blockRange =
    $cursor != null
      ? $cursor.blockRange()
      : node != null ? selection.$from.blockRange(selection.$to) : null

  if (blockRange) {
    // const range = unionOfMarkers(getMarkersAt($cursor || selection.$from))
    // const start = range.index - blockRange.start
    // const end = blockRange.end - range.index - range.length
    // range.
  }

  return blockRange
}

export const markedRange = (selection: Selection): EditRange =>
  unionOfMarkers(getSelectionMarkers(selection), selection.$anchor.doc)

export const unionOfMarkers = (markers: Marker[], doc: Node): EditRange => {
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
  return EditRange.new(index, length, doc)
}

export const endEdit = (
  tr: Transaction,
  range: EditRange,
  schema: Schema
): Transaction => {
  const { selection, doc } = tr
  const { content } = doc.slice(range.index, range.index + range.length)
  const changeList = new ChangeList(range.index, tr, schema, new Map())

  return collapse(content, changeList, schema).tr
}

export const beginEdit = (
  tr: Transaction,
  range: EditRange,
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
    this.insertNode(schema.text(code, [meta, ...marks]))
    // this.insertNode(
    //   schema.node("Markup", { markup: code }, schema.text(code), marks)
    // )
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

    console.group(node.type.name)
    switch (node.type) {
      case schema.nodes.anchor: {
        changeList.index++
        changeList.insertMarkupCode("[", [])
        expand(node.content, changeList, schema)
        changeList.updateMarks([])
        changeList.insertMarkupCode("]", [])
        changeList.insertMarkupCode("(", [])

        const title =
          node.attrs.title == null
            ? ""
            : JSON.stringify(String(node.attrs.title))

        changeList
          .insertMarkup(`${node.attrs.href} ${title}`, node.marks)
          .insertMarkupCode(")", node.marks)
        changeList.index++

        break
      }
      case schema.nodes.heading: {
        const level: number = node.attrs.level || 1
        changeList.index++
        changeList.insertMarkupCode(`${"#".repeat(level)} `, node.marks)
        // changeList.insertMarkup(" ", node.marks)
        expand(node.content, changeList, schema)
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
      case schema.nodes.paragraph: {
        changeList.index++
        expand(node.content, changeList, schema)
        break
      }
      default: {
        // changeList.index++
        // expand(node.content, changeList, schema)
        changeList.retainNode(node)
        break
      }
    }
    console.groupEnd()
    index++
  }

  return changeList
}

const isMarkup = (node: Node) =>
  node.type.spec.markup || node.marks.some(isMarkupMark)

const isMarkupMark = (mark: Mark) => {
  const spec = mark.type.spec
  return spec.markup || null ? true : false
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
    if (node.type.spec.markup) {
      changeList.deleteNode(node)
    } else if (marks.some(isMarkupMark)) {
      changeList.deleteNode(node)
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

export const commitEdit = (
  range: EditRange,
  tr: Transaction,
  schema: Schema
): ?Transaction => {
  const delta = collapse(
    tr.doc.slice(range.index, range.index + range.length).content,
    new ChangeList(range.index, tr, schema, new Map()),
    schema
  )
  const newRange = range.map(delta.tr.mapping, delta.tr.doc)
  const slice = tr.doc.slice(newRange.index, newRange.index + newRange.length)
  const markup = Serializer.serializeInline(slice.content)
  const { content } = Parser.parse(`${markup}`)

  const input = slice.content.textBetween(0, slice.content.size)
  if (input !== content.textBetween(0, content.size)) {
  }

  const newTr = patch(
    slice.content,
    content,
    new ChangeList(newRange.index, delta.tr, schema, new Map()),
    schema
  )
  if (newTr) {
    const range = newRange.map(newTr.mapping, newTr.doc)
    return beginEdit(newTr, range, schema)
  } else {
    return null
  }
}

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
  const stepCount = changeList.tr.steps.length

  while (lastIndex < lastCount) {
    const lastChild = last.child(lastIndex)
    if (isMarkup(lastChild)) {
      lastIndex++
      continue
    }
    const nextChild = nextIndex < nextCount ? next.child(nextIndex) : null

    if (nextChild != null && lastChild.eq(nextChild)) {
      changeList.retainNode(lastChild)
      lastIndex++
      nextIndex++
    } else {
      if (nextChild && lastChild.type === nextChild.type) {
        changeList.index++
        patch(lastChild.content, nextChild.content, changeList, schema)
        changeList.index++
        lastIndex++
        nextIndex++
      } else {
        changeList.deleteNode(lastChild)
        lastIndex++
      }
    }
  }

  while (nextIndex < nextCount) {
    changeList.insertNode(next.child(nextIndex))
    nextIndex++
  }

  return changeList.tr.steps.length - stepCount > 0 ? changeList.tr : null
}
