// @flow strict

import type { Mark, Node, Schema } from "prosemirror-model"
import { Decoration, DecorationSet, EditorView } from "prosemirror-view"

export default class HeadingView {
  dom: Element
  contentDOM: Element
  mark: HTMLElement
  editor: EditorView
  static new(node: Node, editor: EditorView) {
    return new HeadingView(node, editor)
  }
  constructor(node: Node, editor: EditorView) {
    const level = node.attrs.level || 1
    const tagName = `h${level}`
    const dom = editor.root.createElement(tagName)
    const mark = editor.root.createElement("mark")
    const content = editor.root.createElement("span")
    mark.textContent = node.attrs.markup
    dom.appendChild(mark)
    dom.appendChild(content)
    this.dom = dom
    this.contentDOM = content
    this.mark = mark
    this.update(node)
  }
  update(node: Node) {
    if (node.attrs.expand) {
      this.dom.classList.add("expand")
    } else {
      this.dom.classList.remove("expand")
    }
    return true
  }
}
