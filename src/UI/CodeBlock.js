// @flow strict

import CodeMirror from "codemirror"
import "codemirror/mode/javascript/javascript"
import "codemirror/lib/codemirror.css"
import "codemirror/lib/codemirror.css"

import { exitCode } from "prosemirror-commands"
import { undo, redo } from "prosemirror-history"
import type { EditorView } from "prosemirror-view"
import { TextSelection, Selection, NodeSelection } from "prosemirror-state"
import { Fragment } from "prosemirror-model"
import type { Node } from "prosemirror-model"

type Direction = -1 | 1
type Unit = "line" | "char"

export default class CodeBlockView {
  node: Node
  view: EditorView
  getPos: () => number
  cm: CodeMirror
  dom: HTMLElement
  updating: boolean
  static new(
    node: Node,
    view: EditorView,
    getPos: () => number
  ): CodeBlockView {
    const self = new CodeBlockView()
    // Store for later
    self.node = node
    self.view = view
    self.getPos = getPos

    // Create a CodeMirror instance
    self.cm = new CodeMirror(null, {
      value: self.node.textContent,
      lineNumbers: false,
      extraKeys: self.codeMirrorKeymap()
    })

    // The editor's outer node is our DOM representation
    self.dom = self.cm.getWrapperElement()
    // CodeMirror needs to be in the DOM to properly initialize, so
    // schedule it to update itself
    setTimeout(() => self.cm.refresh(), 20)

    // This flag is used to avoid an update loop between the outer and
    // inner editor
    self.updating = false
    // Propagate updates from the code editor to ProseMirror
    self.cm.on("cursorActivity", () => {
      if (!self.updating) {
        self.forwardSelection()
      }
    })
    self.cm.on("change", cm => {
      self.updating = true
    })
    self.cm.on("changes", (cm, changes) => {
      self.valueChanged()
    })
    self.cm.on("focus", () => self.forwardSelection())
    self.cm.on("beforeChange", (cm, change) => {
      if (
        change.origin === "+delete" &&
        self.cm.doc.lineCount() === 1 &&
        self.cm.doc.getLine(0).length === 0
      ) {
        self.delete()
      }
    })

    return self
  }
  // }
  // nodeview_forwardSelection{
  forwardSelection() {
    if (this.cm.hasFocus()) {
      let state = this.view.state
      let selection = this.asProseMirrorSelection(state.doc)
      if (!selection.eq(state.selection)) {
        this.view.dispatch(state.tr.setSelection(selection))
      }
    }
  }
  // }
  // nodeview_asProseMirrorSelection{
  asProseMirrorSelection(doc: Node) {
    const offset = this.getPos() + 1
    const anchor = this.cm.indexFromPos(this.cm.getCursor("anchor")) + offset
    const head = this.cm.indexFromPos(this.cm.getCursor("head")) + offset
    return TextSelection.create(doc, anchor, head)
  }
  // }
  // nodeview_setSelection{
  setSelection(anchor: number, head: number) {
    this.cm.focus()
    this.updating = true
    this.cm.setSelection(
      this.cm.posFromIndex(anchor),
      this.cm.posFromIndex(head)
    )
    this.updating = false
  }
  // }
  // nodeview_valueChanged{
  valueChanged() {
    let change = computeChange(this.node.textContent, this.cm.getValue())
    if (change) {
      let start = this.getPos() + 1
      let tr = this.view.state.tr.replaceWith(
        start + change.from,
        start + change.to,
        change.text ? this.view.state.schema.text(change.text) : Fragment.empty
      )
      this.view.dispatch(tr)
    }
  }
  delete() {
    const { view } = this
    const position = this.getPos()
    const selection = Selection.near(view.state.doc.resolve(position))

    const transation = view.state.tr
      .delete(position - 1, position + 1)
      .insert(position, view.state.schema.node("paragraph"))
      .setSelection(selection)
      .scrollIntoView()

    this.view.dispatch(transation)
    this.view.focus()
  }
  // }
  // nodeview_keymap{
  codeMirrorKeymap() {
    let view = this.view
    let mod = /Mac/.test(navigator.platform) ? "Cmd" : "Ctrl"
    return CodeMirror.normalizeKeyMap({
      Up: () => this.maybeEscape("line", -1),
      Left: () => this.maybeEscape("char", -1),
      Down: () => this.maybeEscape("line", 1),
      Right: () => this.maybeEscape("char", 1),
      [`${mod}-Z`]: () => undo(view.state, view.dispatch),
      [`Shift-${mod}-Z`]: () => redo(view.state, view.dispatch),
      [`${mod}-Y`]: () => redo(view.state, view.dispatch),
      "Ctrl-Enter": () => {
        if (exitCode(view.state, view.dispatch)) view.focus()
      }
    })
  }

  maybeEscape(unit: Unit, dir: Direction) {
    let pos = this.cm.getCursor()
    if (
      this.cm.somethingSelected() ||
      pos.line != (dir < 0 ? this.cm.firstLine() : this.cm.lastLine()) ||
      (unit == "char" &&
        pos.ch != (dir < 0 ? 0 : this.cm.getLine(pos.line).length))
    )
      return CodeMirror.Pass
    this.view.focus()
    let targetPos = this.getPos() + (dir < 0 ? 0 : this.node.nodeSize)
    let selection = Selection.near(this.view.state.doc.resolve(targetPos), dir)
    this.view.dispatch(
      this.view.state.tr.setSelection(selection).scrollIntoView()
    )
    this.view.focus()
  }
  // }
  // nodeview_update{
  update(node: Node) {
    if (node.type != this.node.type) return false
    this.node = node
    let change = computeChange(this.cm.getValue(), node.textContent)
    if (change) {
      this.updating = true
      this.cm.replaceRange(
        change.text,
        this.cm.posFromIndex(change.from),
        this.cm.posFromIndex(change.to)
      )
      this.updating = false
    }
    return true
  }
  // }
  // nodeview_end{

  selectNode() {
    this.cm.focus()
  }
  deselectNode() {}
  stopEvent(event: Event) {
    return true
  }
}
// }

// computeChange{
const computeChange = (oldVal, newVal) => {
  if (oldVal == newVal) return null
  let start = 0,
    oldEnd = oldVal.length,
    newEnd = newVal.length
  while (start < oldEnd && oldVal.charCodeAt(start) == newVal.charCodeAt(start))
    ++start
  while (
    oldEnd > start &&
    newEnd > start &&
    oldVal.charCodeAt(oldEnd - 1) == newVal.charCodeAt(newEnd - 1)
  ) {
    oldEnd--
    newEnd--
  }
  return { from: start, to: oldEnd, text: newVal.slice(start, newEnd) }
}
// }
