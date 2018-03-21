// @flow strict

import type { Transaction } from "prosemirror-state"
import type { Node, Schema, NodeRange, ResolvedPos } from "prosemirror-model"
import { findMarkupRange } from "./Marks"
import { Selection, TextSelection } from "prosemirror-state"
import { Fragment, Slice, Mark } from "prosemirror-model"
import Parser from "../Allusion/Parser"
import Serializer from "../Allusion/Serializer"
import { Decoration, DecorationSet } from "prosemirror-view"
import type { Mapping } from "prosemirror-transform"
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
  const { nodes } = doc.type.schema

  if ($cursor) {
    let depth = $cursor.depth
    while (depth > 0) {
      const node = $cursor.node(depth)
      switch (node.type) {
        case nodes.expandedImage:
        case nodes.expandedHorizontalRule:
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
  } else if (node) {
    switch (node.type) {
      case nodes.horizontal_rule:
      case nodes.image: {
        return EditRange.fromSelection(selection)
      }
    }
  }

  return EditRange.empty

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

export const endEdit = (
  tr: Transaction,
  range: EditRange,
  schema: Schema
): Transaction => {
  const { selection, doc } = tr
  const { content } = doc.slice(range.index, range.index + range.length)
  const changeList = new ChangeList(range.index, tr, schema, new Map())

  return collapseFragment(content, changeList, schema).tr
}

export const beginEdit = (
  tr: Transaction,
  range: EditRange,
  schema: Schema
): Transaction => {
  const { selection, doc } = tr
  const { content } = doc.slice(range.index, range.index + range.length)
  const changeList = new ChangeList(range.index, tr, schema, new Map())

  return expandFragment(content, changeList, schema).toTransaction()
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
  enterNode(marks: Mark[]) {
    this.index++
    this.updateMarks(marks)
    return this
  }
  exitNode() {
    this.updateMarks([])
    this.index++
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
    return this.updateMarks(node.marks).retainNode(node)
  }
  retainMarkedText(node: Node) {
    return this.retainMarked(node)
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
  setCaret(offset: number) {
    const position = this.tr.doc.resolve(this.index + offset)
    this.tr = this.tr.setSelection(new TextSelection(position))
    return this
  }
  isSelected(target: Node): boolean {
    const { selection, doc } = this.tr
    const { node, $cursor } = selection
    if (node === target) {
      return true
    } else if ($cursor) {
      return doc.nodeAt($cursor.pos) === target
    } else {
      const { from, to } = selection
      return doc.nodeAt(from) === target || doc.nodeAt(to) === target
    }
  }
  toTransaction() {
    return this.updateMarks([]).tr
  }
}

export const expandFragment = (
  content: Fragment,
  changeList: ChangeList,
  schema: Schema
): ChangeList => {
  const count = content.childCount
  let index = 0
  let changes = changeList

  while (index < count) {
    const node = content.child(index)
    changes = expandNode(node, changes, schema)
    index++
  }

  return changes
}

export const expandNode = (
  node: Node,
  changeList: ChangeList,
  schema: Schema
): ChangeList => {
  switch (node.type) {
    case schema.nodes.anchor: {
      return expandAnchor(node, changeList, schema)
    }
    case schema.nodes.heading: {
      return expandHeading(node, changeList, schema)
    }
    case schema.nodes.horizontal_rule: {
      return expandHorizontalRule(node, changeList, schema)
    }
    case schema.nodes.image: {
      return expandImage(node, changeList, schema)
    }
    case schema.nodes.text: {
      return expandText(node, changeList, schema)
    }
    case schema.nodes.paragraph: {
      return expandParagraph(node, changeList, schema)
    }
    default: {
      return changeList.retainMarked(node)
    }
  }
}

export const expandAnchor = (
  node: Node,
  changeList: ChangeList,
  schema: Schema
) => {
  changeList.enterNode(node.marks)
  changeList.insertMarkupCode("[", node.marks)
  expandFragment(node.content, changeList, schema)
  changeList.insertMarkupCode("]", [])
  changeList.insertMarkupCode("(", [])

  const title =
    node.attrs.title == null ? "" : JSON.stringify(String(node.attrs.title))

  changeList
    .insertMarkup(`${node.attrs.href} ${title}`, [])
    .insertMarkupCode(")", [])

  return changeList.exitNode()
}

export const expandImage = (
  node: Node,
  changeList: ChangeList,
  schema: Schema
) => {
  // changeList
  //   .insertMarkupCode("![", node.marks)
  //   .insertMarkup(node.attrs.alt, node.marks)
  //   .insertMarkupCode("](", node.marks)

  const title =
    node.attrs.title == null ? "" : JSON.stringify(String(node.attrs.title))

  const isSelected = changeList.isSelected(node)

  // return changeList
  //   .insertMarkup(`${node.attrs.src} ${title}`, node.marks)
  //   .insertMarkupCode(")", node.marks)
  //   .retainMarked(node)
  const expandedNode = schema.node(
    "expandedImage",
    node.attrs,
    [
      schema.text("![", [changeList.meta, ...node.marks]),
      schema.text(node.attrs.alt, [changeList.markup, ...node.marks]),
      schema.text("](", [changeList.meta, ...node.marks]),
      schema.text(`${node.attrs.src} ${title}`, [
        changeList.markup,
        ...node.marks
      ]),
      schema.text(")", [changeList.meta, ...node.marks])
    ],
    node.marks
  )

  const changes = changeList.deleteNode(node).insertNode(expandedNode)

  return isSelected ? changes.setCaret(-expandedNode.nodeSize + 3) : changes
}

export const expandText = (
  node: Node,
  changeList: ChangeList,
  schema: Schema
) => {
  return changeList.retainMarkedText(node)
}

export const expandHeading = (
  node: Node,
  changeList: ChangeList,
  schema: Schema
) => {
  const level: number = node.attrs.level || 1
  changeList.enterNode(node.marks)
  changeList.insertMarkupCode(`${"#".repeat(level)} `, node.marks)
  expandFragment(node.content, changeList, schema)
  return changeList.exitNode()
}

export const expandParagraph = (
  node: Node,
  changeList: ChangeList,
  schema: Schema
) => {
  changeList.enterNode(node.marks)
  expandFragment(node.content, changeList, schema)
  return changeList.exitNode()
}

export const expandHorizontalRule = (
  node: Node,
  changeList: ChangeList,
  schema: Schema
) => {
  const isSelected = changeList.isSelected(node)
  // return changeList.retainMarked(node)
  const expandedNode = schema.node("expandedHorizontalRule", node.attrs, [
    schema.text(node.attrs.markup, [changeList.meta, ...node.marks])
  ])
  const changes = changeList.deleteNode(node).insertNode(expandedNode)
  return isSelected ? changes.setCaret(-expandedNode.nodeSize + 1) : changes
}

const isMarkupNode = (node: Node) => "markup" in node.type.spec

const isMarkupMark = (mark: Mark) => "markup" in mark.type.spec

const isMarkup = (node: Node) =>
  isMarkupNode(node) || node.marks.some(isMarkupMark)

export const collapseFragment = (
  content: Fragment,
  changeList: ChangeList,
  schema: Schema
): ChangeList => {
  let index = 0
  let changes = changeList
  const count = content.childCount
  while (index < count) {
    changes = collapseNode(content.child(index), changes, schema)
    index += 1
  }
  return changes
}

export const collapseNode = (
  node: Node,
  changeList: ChangeList,
  schema: Schema
): ChangeList => {
  if (isMarkup(node)) {
    return changeList.deleteNode(node)
  } else {
    const { nodes } = schema
    switch (node.type) {
      case nodes.text: {
        return collapseText(node, changeList, schema)
      }
      case nodes.expandedImage: {
        return collapseImage(node, changeList, schema)
      }
      case nodes.expandedHorizontalRule: {
        return collapseHorizontalRule(node, changeList, schema)
      }
      default: {
        changeList.enterNode([])
        collapseFragment(node.content, changeList, schema)
        return changeList.exitNode()
      }
    }
  }
}

export const collapseText = (
  node: Node,
  changeList: ChangeList,
  schema: Schema
): ChangeList => {
  return changeList.retainNode(node)
}

export const collapseImage = (
  node: Node,
  changeList: ChangeList,
  schema: Schema
): ChangeList => {
  const image = schema.node("image", node.attrs, undefined, node.marks)
  return changeList.deleteNode(node).insertNode(image)
}

export const collapseHorizontalRule = (
  node: Node,
  changeList: ChangeList,
  schema: Schema
): ChangeList => {
  const collapsedNode = schema.node(
    "horizontal_rule",
    node.attrs,
    undefined,
    node.marks
  )
  return changeList.deleteNode(node).insertNode(collapsedNode)
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
  const result = Serializer.serialize(content).trim()
  if (markup.trim() !== result || result === "") {
    return null
  } else {
    const tr2 = tr.replaceWith(range.index, range.index + range.length, output)

    const tr3 = expandNode(
      output,
      new ChangeList(range.index, tr2, schema, new Map()),
      schema
    ).toTransaction()

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
