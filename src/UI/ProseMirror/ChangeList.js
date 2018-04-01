// @flow strict

import type { Transaction } from "prosemirror-state"
import type { Node, Schema, Fragment } from "prosemirror-model"
import { Mark } from "prosemirror-model"
import { TextSelection } from "prosemirror-state"
import { isntMarkup, isMarkup } from "./Marks"

export default class ChangeList {
  tr: Transaction
  index: number
  schema: Schema
  storedMarks: Map<string, Mark>
  markupText: Mark
  markupMarker: Mark
  markupMark: Mark
  editMark: Mark
  static new(index: number, tr: Transaction): ChangeList {
    return new ChangeList(index, tr, new Map())
  }
  constructor(index: number, tr: Transaction, storedMarks: Map<string, Mark>) {
    this.index = index
    this.tr = tr
    this.storedMarks = storedMarks
    this.schema = tr.doc.type.schema

    this.markupText = this.schema.mark("markup")
    this.markupMarker = this.schema.mark("markup", { code: "" })
    this.markupMark = this.markupMarker
    this.editMark = this.schema.mark("edit")
  }
  storedMarkup(): string {
    return [...this.storedMarks.keys()].join(" ")
  }
  markupNode(markup: string) {
    return this.schema.text(markup, [
      this.editMark,
      this.schema.mark("markup", {
        code: "",
        marks: [...this.storedMarks.keys()]
      })
    ])
  }
  markup(text: string, marks: Mark[] = Mark.none): Node {
    return this.schema.text(text, [this.markupText, this.editMark]) //, ...marks])
  }
  marker(text: string, marks: Mark[] = Mark.none): Node {
    return this.schema.text(text, [this.markupMarker, this.editMark]) //, ...marks])
  }
  updateMarks(marks: Mark[]) {
    const newMarks = new Map()
    const { storedMarks } = this

    for (let mark of marks) {
      const markup: string = mark.attrs["markup"] || ""
      const marked = mark.attrs.marked
      if (markup != "" && marked == null) {
        newMarks.set(markup, mark)
      }
    }

    // Delete or preserve existing marks
    for (let [markup, mark] of storedMarks.entries()) {
      if (newMarks.has(markup)) {
        newMarks.delete(markup)
      } else {
        this.markupMark = this.schema.mark("markup", {
          code: "",
          marks: this.storedMarkup()
        })
        storedMarks.delete(markup)
        this.endMark(markup)
      }
    }

    // Open new marks
    for (const [markup, mark] of newMarks.entries()) {
      storedMarks.set(markup, mark)
      this.markupMark = this.schema.mark("markup", {
        code: "",
        marks: this.storedMarkup()
      })
      this.startMark(markup)
    }

    return this
  }
  enterNode(node: Node) {
    return this.retain(1).updateMarks(node.marks)
  }
  enterMarked(node: Node) {
    return this.updateNodeAttrs(node, marked)
      .retain(1)
      .updateMarks(node.marks)
  }
  enterUnmarked(node: Node) {
    return this.updateNodeAttrs(node, unmarked)
      .retain(1)
      .updateMarks(node.marks)
  }
  exitNode() {
    this.updateMarks(Mark.none)
    this.index++
    return this
  }
  insertMarker(markup: string, marks: Mark[] = Mark.none) {
    return this.updateMarks(marks).insertNode(
      this.schema.text(markup, [this.markupMarker]) //, ...marks])
    )
  }
  startMark(markup: string) {
    return this.insertNode(
      this.schema.text(markup, [this.markupMark, this.editMark])
    )
  }
  endMark(markup: string) {
    return this.insertNode(
      this.schema.text(markup, [this.markupMark, this.editMark])
    )
  }
  insertMarkup(
    markup: string,
    marks: Mark[] = Mark.none,
    attrs: ?Object = null
  ) {
    const node =
      attrs == null
        ? this.markup(markup, marks)
        : this.schema.text(markup, [
            this.markupText.type.create(attrs),
            ...marks
          ])
    return this.insertNode(node)
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
    return this.retain(node.nodeSize)
  }
  retainMarked(node: Node) {
    return node.isText
      ? this.retainMarkedText(node)
      : this.retainMarkedNode(node)
  }
  retainMarkedNode(node: Node) {
    return this.updateMarks(node.marks)
      .updateNodeAttrs(node, marked)
      .retainNode(node)
  }
  retainMarkedText(node: Node) {
    if (node.marks.some(mark => mark.attrs.edit)) {
      return this.updateMarks(Mark.none).retainNode(node)
    } else {
      const marks = [...node.marks, this.editMark]
      return this.updateMarks(marks)
        .markText(node, this.editMark)
        .retainNode(node)
    }
  }
  retainUnmarked(node: Node) {
    return node.isText
      ? this.retainUnmarkedText(node)
      : this.retainUnmarkedNode(node)
  }
  retainUnmarkedText(node: Node) {
    return this.unmarkText(node, this.editMark).retainNode(node)
  }
  retainUnmarkedNode(node: Node) {
    return this.updateNodeAttrs(node, unmarked).retainNode(node)
  }
  updateNodeAttrs(node: Node, update: Object => Object) {
    this.tr = this.tr.setNodeMarkup(
      this.index,
      node.type,
      update(node.attrs),
      node.marks
    )
    return this
  }
  markText(node: Node, mark: Mark) {
    this.tr = this.tr.addMark(this.index, this.index + node.nodeSize, mark)
    return this
  }
  unmarkText(node: Node, mark: Mark) {
    this.tr = this.tr.removeMark(this.index, this.index + node.nodeSize, mark)
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
  direction(): number {
    const after = this.tr.selection
    const before = this.tr.getMeta("selectionBefore") || after
    if ((before.empty || before.node) && (after.empty || after.node)) {
      const last = (before.from + before.to) / 2
      const next = (after.from + after.to) / 2
      return last > next ? -1 : last < next ? 1 : 0
    } else {
      return 0
    }
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
    return this.updateMarks(Mark.none).tr
  }
}

const unmarked = (attrs: Object): Object =>
  attrs.marked != null ? Object.assign({}, attrs, { marked: null }) : attrs

const marked = (attrs: Object): Object =>
  attrs.marked != null ? attrs : Object.assign({}, attrs, { marked: "" })

const asMarked = (mark: Mark): Mark =>
  mark.attrs.marked != null ? mark : mark.type.create(marked(mark.attrs))

const asUnmarked = (mark: Mark): Mark =>
  mark.attrs.marked != null ? mark.type.create(unmarked(mark.attrs)) : mark
