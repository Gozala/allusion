// @flow strict

import type { Transaction } from "prosemirror-state"
import { Node, Schema, NodeRange } from "prosemirror-model"
import { getSelectionMarkers, getMarkersAt, type Marker } from "./Marks"
import { Selection, TextSelection } from "prosemirror-state"
import { Fragment, Slice, Mark } from "prosemirror-model"
import Parser from "../Allusion/Parser"
import Serializer from "../Allusion/Serializer"
import { Decoration, DecorationSet } from "prosemirror-view"
import type { Mapping } from "prosemirror-transform"
import diff from "fast-diff"
import { textOffsetFromPosition, positionFromTextOffset } from "./Position"

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
          const [start, end] = [
            $cursor.start(depth) - 1,
            $cursor.end(depth) + 1
          ]
          return EditRange.new(start, end - start, doc)
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
    // this.insertNode(
    //   schema.text(code, [
    //     meta,
    //     ...marks.map(mark =>
    //       mark.type.create(Object.assign({}, mark.attrs, { marked: true }))
    //     )
    //   ])
    // )
    // for (let char of code) {
    //   this.insertNode(
    //     schema.node("Markup", { markup: char }, schema.text(char, marks))
    //   )
    // }
    this.insertNode(schema.text(code, [meta, ...marks]))
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
  insert(content: Fragment) {
    this.tr = this.tr.insert(this.index, content)
    this.index += content.size
    return this
  }
  retain(size: number) {
    this.index += size
    return this
  }
  retainNode(node: Node) {
    this.index += node.nodeSize
    return this
  }
  retainMarked(node: Node) {
    // this.tr = this.tr.setNodeMarkup(this.index, null, { marked: "true" })
    return this.retainNode(node)
  }
  retainMarkedText(node: Node) {
    const from = this.index
    const to = this.index + node.nodeSize
    const selection = this.tr.selection

    // for (const mark of node.marks) {
    //   const attributes = Object.assign({}, mark.attrs, { marked: true })
    //   this.tr.removeMark(from, to, mark)
    //   this.tr.addMark(from, to, mark.type.create(attributes))
    // }

    this.index = to
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
  delete(size: number) {
    this.tr = this.tr.delete(this.index, this.index + size)
    return this
  }
  patchTextNode({ from, to, text }: TextDelta) {
    const { tr, index, schema } = this
    const start = index + from
    const end = index + to
    this.tr = this.tr.insertText(text, start, end)
    this.index = start + text.length

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
    expandNode(node, changeList, schema)
    index++
  }

  return changeList
}

export const expandNode = (
  node: Node,
  changeList: ChangeList,
  schema: Schema
): ChangeList => {
  switch (node.type) {
    case schema.nodes.anchor: {
      changeList.index++
      changeList.insertMarkupCode("[", [])
      expand(node.content, changeList, schema)
      changeList.updateMarks([])
      changeList.insertMarkupCode("]", [])
      changeList.insertMarkupCode("(", [])

      const title =
        node.attrs.title == null ? "" : JSON.stringify(String(node.attrs.title))

      changeList
        .insertMarkup(`${node.attrs.href} ${title}`, node.marks)
        .insertMarkupCode(")", node.marks)
      changeList.index++

      return changeList
    }
    case schema.nodes.heading: {
      const level: number = node.attrs.level || 1
      changeList.index++
      changeList.insertMarkupCode(`${"#".repeat(level)} `, node.marks)
      // changeList.insertMarkup(" ", node.marks)
      return expand(node.content, changeList, schema)
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
        node.attrs.title == null ? "" : JSON.stringify(String(node.attrs.title))

      return changeList
        .insertMarkup(`${node.attrs.src} ${title}`, node.marks)
        .insertMarkupCode(")", node.marks)
        .retainMarked(node)
    }
    case schema.nodes.text: {
      return changeList.retainMarkedText(node)
    }
    case schema.nodes.paragraph: {
      changeList.index++
      return expand(node.content, changeList, schema)
    }
    default: {
      // changeList.index++
      // expand(node.content, changeList, schema)
      return changeList.retainMarked(node)
    }
  }
}

const isMarkupNode = (node: Node) => "markup" in node.type.spec

const isMarkupMark = (mark: Mark) => "markup" in mark.type.spec

const isMarkup = (node: Node) =>
  isMarkupNode(node) || node.marks.some(isMarkupMark)

export const collapse = (
  content: Fragment,
  changeList: ChangeList,
  schema: Schema
): ChangeList => {
  let index = 0
  const count = content.childCount
  while (index < count) {
    const node = content.child(index)
    if (isMarkup(node)) {
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
  // const delta = collapse(
  //   tr.doc.slice(range.index, range.index + range.length).content,
  //   new ChangeList(range.index, tr, schema, new Map()),
  //   schema
  // )
  // const newRange = range.map(delta.tr.mapping, delta.tr.doc)
  // const input = tr.doc.slice(range.index, range.index + range.length)
  const input = tr.doc.nodeAt(range.index)
  if (!input) return null
  const markup = input.textContent //Serializer.serializeInline(input.content)
  const index = tr.selection.from
  const offset = textOffsetFromPosition(tr.doc, index)
  const { firstChild: output, content } = Parser.parse(markup)
  if (!output || !offset) {
    return null
  }
  const result = Serializer.serialize(content)
  if (markup.trim() !== result.trim()) {
    return null
  } else {
    const tr2 = tr.replaceWith(range.index, range.index + range.length, output)

    const tr3 = expandNode(
      output,
      new ChangeList(range.index, tr2, schema, new Map()),
      schema
    ).updateMarks([]).tr

    const position = positionFromTextOffset(tr3.doc, offset)
    if (position == null) {
      return null
    } else {
      return tr3.setSelection(TextSelection.create(tr3.doc, position))
    }
    // return patch2(
    //   input,
    //   output,
    //   tr.selection.from,
    //   new ChangeList(range.index, tr, schema, new Map()),
    //   schema
    // )
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
  const root = changeList.tr.doc

  while (lastIndex < lastCount) {
    const lastChild = last.child(lastIndex)
    if (isMarkup(lastChild)) {
      lastIndex++
      changeList.deleteNode(lastChild)
      continue
    }
    const nextChild = nextIndex < nextCount ? next.child(nextIndex) : root

    if (lastChild.eq(nextChild)) {
      changeList.retainNode(lastChild)
      lastIndex++
      nextIndex++
    } else if (lastChild.type === nextChild.type) {
      if (lastChild.isText) {
        const delta = diffText(lastChild.textContent, nextChild.textContent)
        if (delta) {
          changeList.patchTextNode(delta)
          lastIndex++
          nextIndex++
        } else {
          changeList.retainNode(lastChild)
          lastIndex++
          nextIndex++
        }
      } else {
        changeList.index++
        patch(lastChild.content, nextChild.content, changeList, schema)
        changeList.index++
        lastIndex++
        nextIndex++
      }
    } else {
      changeList.deleteNode(lastChild)
      lastIndex++
    }
  }

  while (nextIndex < nextCount) {
    changeList.insertNode(next.child(nextIndex))
    nextIndex++
  }

  return changeList.tr.steps.length - stepCount > 0 ? changeList.tr : null
}

class TextDelta {
  +from: number
  +to: number
  +text: string
  constructor(from: number, to: number, text: string) {
    this.from = from
    this.to = to
    this.text = text
  }
}

const diffText = (before: string, after: string): ?TextDelta => {
  if (before !== after) {
    let sizeBefore = before.length
    let sizeAfter = after.length

    let from = 0

    // find index at which text starts to diverge.
    while (
      from < sizeBefore &&
      before.charCodeAt(from) == after.charCodeAt(from)
    ) {
      from++
    }

    // find index at which text starts to diverge in from the rear.
    while (
      sizeBefore > from &&
      sizeAfter > from &&
      before.charCodeAt(sizeBefore - 1) === after.charCodeAt(sizeAfter - 1)
    ) {
      sizeBefore--
      sizeAfter--
    }

    const text = after.slice(from, sizeBefore)
    return new TextDelta(from, sizeBefore, text)
  } else {
    return null
  }
}

const NODE_OPEN = "<" //String.fromCharCode(1)
const NODE_CLOSE = ">" //String.fromCharCode(0)

const encode = (root: Node): string => {
  let text = ""
  let depth = 0
  root.descendants((node, pos, parent) => {
    if (pos > text.length) {
      depth--
      text += NODE_CLOSE
    }
    if (node.content.size > 0) {
      depth++
      text += NODE_OPEN
    } else {
      text += node.textContent
    }
  })
  if (depth > 0) {
    text += NODE_CLOSE
  }
  return text
}

const patch2 = (
  before: Node,
  after: Node,
  position: number,
  changeList: ChangeList,
  schema: Schema
): ?Transaction => {
  const delta = diff(encode(before), encode(after), position)
  let offsetBefore = 0
  let offsetAfter = 0
  changeList.index++
  const count = changeList.tr.steps.length
  for (const [op, content] of delta) {
    const size: number = content.length
    switch (op) {
      case diff.INSERT: {
        if (content === NODE_OPEN) {
          offsetAfter += size
        } else {
          changeList.insert(
            after.slice(offsetAfter, offsetAfter + size).content
          )
          offsetAfter += size
        }
        break
      }
      case diff.DELETE: {
        changeList.delete(size)
        offsetBefore += size
        break
      }
      case diff.EQUAL: {
        const sliceBefore = before.slice(offsetBefore, offsetBefore + size)
        const sliceAfter = after.slice(offsetAfter, offsetAfter + size)
        if (sliceBefore.content.eq(sliceAfter.content)) {
          changeList.retain(size)
        } else {
          changeList.delete(size).insert(sliceAfter.content)
        }
        offsetBefore += size
        offsetAfter += size
        break
      }
    }
  }
  return changeList.tr.steps.length === count ? null : changeList.tr
}

const eq = (left: Fragment, right: Fragment): boolean => {
  if (left.size !== right.size) {
    return false
  } else {
    const size = left.size
    let index = 0
    while (index < size) {
      const leftChild = left.content[index]
      const rightChild = right.content[index]
      if (leftChild !== rightChild) {
        if (!eq(leftChild.content, rightChild.content)) {
          return false
        } else if (leftChild.type !== rightChild.type) {
          return false
        }
      }
      index++
    }
  }
  return true
}
