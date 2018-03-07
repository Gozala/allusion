// @flow strict

import type { EditorView } from "prosemirror-view"
import type { Node } from "prosemirror-model"

export default class InlineNode {
  node: Node
  view: EditorView
  getPos: () => number
  dom: ?HTMLElement
  contentDOM: HTMLElement
  prefix: string
  suffix: string
  static new(node: Node, view: EditorView, getPos: () => number): InlineNode {
    const document = view.dom.ownerDocument
    const [name, attrs] = (node.type.spec: any).toDOM(node)
    const contentDOM = document.createElement(name)
    contentDOM.textContent = node.textContent
    for (const name in attrs) {
      contentDOM.setAttribute(name, node.attrs[name])
    }

    return new InlineNode(node, view, getPos, contentDOM, contentDOM)
  }
  constructor(
    node: Node,
    view: EditorView,
    getPos: () => number,
    dom: ?HTMLElement,
    contentDOM: HTMLElement
  ) {
    this.view = view
    this.node = node
    this.getPos = getPos
    this.dom = null
    this.contentDOM = contentDOM
  }

  resolvePosition() {
    return this.view.state.doc.resolve(this.getPos())
  }
  update(node: Node) {
    return true
  }
}
