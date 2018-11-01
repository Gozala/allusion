// @flow strict

// import "codemirror/lib/codemirror.css"

import CodeMirror from "../codemirror/index.js"
import "../codemirror/mode/javascript/javascript.js"
import { Plugin } from "../prosemirror-state/src/index.js"
import { exitCode } from "../prosemirror-commands/src/commands.js"
import { undo, redo } from "../prosemirror-history/src/history.js"
import {
  TextSelection,
  Selection,
  NodeSelection
} from "../prosemirror-state/src/index.js"
import { Fragment } from "../prosemirror-model/src/index.js"
import keyDownHandler from "./CodeBlock/KeyDownHandler.js"

/*::
import type { Editor, EditorChangeLinkedList } from "../codemirror/index.js"
import type { EditorView } from "../prosemirror-view/src/index.js"
import type { Node } from "../prosemirror-model/src/index.js"
type Direction = -1 | 1
type Unit = "line" | "char"
*/

export default class CodeBlockView {
  /*::
  node: Node
  view: EditorView
  getPos: () => number
  cm: Editor
  dom: HTMLElement
  updating: boolean
  */
  static new(
    node/* : Node */,
    view/* : EditorView */,
    getPos/* : () => number */
  )/* : CodeBlockView */ {
    const self = new CodeBlockView()
    // Store for later
    self.node = node
    self.view = view
    self.getPos = getPos

    // Create a CodeMirror instance
    self.cm = CodeMirror(null, {
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
    self.cm.on("changes", (
      cm /*:Editor*/,
      changes /*:EditorChangeLinkedList*/
    ) => {
      self.valueChanged()
    })
    self.cm.on("focus", () => self.forwardSelection())
    self.cm.on("beforeChange", (
      cm /*:Editor*/,
      change /*:EditorChangeLinkedList*/
    ) => {
      if (
        change.origin === "+delete" &&
        self.cm.getDoc().lineCount() === 1 &&
        self.cm.getDoc().getLine(0).length === 0
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
  asProseMirrorSelection(node/* : Node */) {
    const offset = this.getPos() + 1
    const doc = this.cm.getDoc()
    const anchor = doc.indexFromPos(doc.getCursor("anchor")) + offset
    const head = doc.indexFromPos(doc.getCursor("head")) + offset
    return TextSelection.create(node, anchor, head)
  }
  // }
  // nodeview_setSelection{
  setSelection(anchor/* : number */, head/* : number */) {
    this.cm.focus()
    this.updating = true
    const doc = this.cm.getDoc()
    doc.setSelection(doc.posFromIndex(anchor), doc.posFromIndex(head))
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
    // .scrollIntoView()

    this.view.dispatch(transation)
    // this.view.focus()
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
        if (exitCode(view.state, view.dispatch)) {
          setTimeout(() => view.focus())
        }
      }
    })
  }

  maybeEscape(unit/* : Unit */, dir/* : Direction */) {
    const doc = this.cm.getDoc()
    let pos = doc.getCursor()
    if (
      doc.somethingSelected() ||
      pos.line != (dir < 0 ? doc.firstLine() : doc.lastLine()) ||
      (unit == "char" && pos.ch != (dir < 0 ? 0 : doc.getLine(pos.line).length))
    )
      return CodeMirror.Pass
    // this.view.focus()

    let targetPos = this.getPos() + (dir < 0 ? 0 : this.node.nodeSize)
    let selection = Selection.near(this.view.state.doc.resolve(targetPos), dir)
    this.view.dispatch(
      this.view.state.tr.setSelection(selection) //.scrollIntoView()
    )
    setTimeout(() => this.view.focus())
  }
  // }
  // nodeview_update{
  update(node/* : Node */) {
    if (node.type != this.node.type) return false
    this.node = node
    let change = computeChange(this.cm.getValue(), node.textContent)
    if (change) {
      this.updating = true
      const doc = this.cm.getDoc()
      doc.replaceRange(
        change.text,
        doc.posFromIndex(change.from),
        doc.posFromIndex(change.to)
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
  stopEvent(event/* : Event */) {
    return true
  }

  static plugin() {
    return new Plugin({
      props: {
        handleKeyDown: keyDownHandler,
        nodeViews: {
          code_block: CodeBlockView.new
        }
      }
    })
  }
}
// }

// computeChange{
const computeChange = (oldVal, newVal) => {
  if (oldVal == newVal) return null
  let start = 0
  let oldEnd = oldVal.length
  let newEnd = newVal.length

  while (
    start < oldEnd &&
    oldVal.charCodeAt(start) == newVal.charCodeAt(start)
  ) {
    ++start
  }

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
