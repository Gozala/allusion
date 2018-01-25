// @flow

import { exitCode } from "prosemirror-commands"
import { undo, redo } from "prosemirror-history"
import type { EditorView } from "prosemirror-view"
import { TextSelection, Selection, NodeSelection } from "prosemirror-state"
import type { Node } from "prosemirror-model"

export default class CodeInlineView {
  node: Node
  view: EditorView
  getPos: () => number
  dom: HTMLElement
  contentDOM: HTMLElement
  isUpdating: boolean = false
  static new(
    node: Node,
    view: EditorView,
    getPos: () => number
  ): CodeInlineView {
    const document = view.dom.ownerDocument
    // The editor's outer node is our DOM representation
    // const prefix = document.createElement("span")
    // prefix.classList.add('prefix')
    // prefix.textContent = "`"
    // // prefix.contentEditable = false

    // const suffix = document.createElement("span")
    // suffix.classList.add('suffix')
    // suffix.textContent = "`"
    // // suffix.contentEditable = false

    const contentDOM = document.createElement("code")
    // contentDOM.contentEditable = true
    contentDOM.classList.add("content")
    contentDOM.textContent = node.textContent
    contentDOM.dataset.prefix = "`"
    contentDOM.dataset.suffix = "`"

    const dom = document.createElement("span")
    // dom.contentEditable = false
    dom.classList.add("code")
    // dom.appendChild(prefix)
    dom.appendChild(contentDOM)
    // dom.appendChild(suffix)

    return new CodeInlineView(node, view, getPos, dom, contentDOM)
  }
  constructor(
    node: Node,
    view: EditorView,
    getPos: () => number,
    dom: HTMLElement,
    contentDOM: HTMLElement
  ) {
    this.view = view
    this.node = node
    this.getPos = getPos
    this.dom = dom
    this.contentDOM = contentDOM
  }

  resolvePosition() {
    return this.view.state.doc.resolve(this.getPos())
  }
  selectNode() {
    console.log("SELECT")
    this.dom.classList.add("selected")
  }
  deselectNode() {
    console.log("DESELECT")
    this.dom.classList.remove("selected")
  }
  // setSelection(anchor: number, head: number) {
  //   this.dom.classList.add("selected")
  //   console.log("SET_SELECTION", anchor, head, this.getPos())
  // }
  update(node: Node) {
    console.log(
      `Update ${JSON.stringify(node)} ${JSON.stringify(
        this.node.textContent
      )} -> ${JSON.stringify(node.textContent)}`
    )
    if (node.type != this.node.type) {
      return false
    } else if (node.textContent.includes("\n")) {
      return false
    } else {
      return true
    }
  }
  stopEvent(event: Event) {
    console.log(event)
    if (event.keyCode === 13) {
      console.log(event)
      return true
    }
  }
  handleEvent(event: KeyboardEvent) {
    console.log(event)
  }

  // delete() {
  //   const { view } = this
  //   const position = view.state.doc.resolve(this.getPos())

  //   const transation = view.state.tr
  //     .delete(position.before(), position.after())

  //   this.view.dispatch(transation)
  // }
}
