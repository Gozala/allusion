// @flow strict

import type {
  Mark,
  Node,
  Schema,
  NodeSpec,
  AttributeSpec
} from "prosemirror-model"

import type { EditorView, NodeView } from "prosemirror-view"

export default class View {
  node: Node
  editor: EditorView
  dom: Element
  contentDOM: Element
  position: () => number
  constructor(node: Node, editor: EditorView, position: () => number) {
    this.node = node
    this.position = position
    this.editor = editor
    this.dom = this.render(node, editor)
    this.contentDOM = this.content(this.dom)
  }
  init(node: Node, editor: EditorView) {}
  get index(): number {
    return this.position()
  }

  static inline: boolean
  static marks: string = ""
  static content: string = ""
  static group: string = ""
  static atom: boolean = false
  static selectable: boolean = true
  static draggable: boolean = false
  static code: boolean = false
  static defining: boolean = false
  static isolating: boolean = false
  static attrs: ?{ [string]: AttributeSpec } = null

  static blotName: string
  static tagName: string = "meta"
  static className: string = ""
  static toDOM(node: Node) {
    return [this.tagName, node.attrs, 0]
  }
  static view() {
    const View = this
    return (
      node: Node,
      editor: EditorView,
      position: () => number
    ): NodeView => {
      return new View(node, editor, position)
    }
  }
  render(node: Node, editor: EditorView): Element {
    const { tagName, className } = this.constructor
    const { root } = this.editor
    const document = root.ownerDocument || root
    const element = document.createElement(tagName)
    if (className !== "") {
      element.classList.add(className)
    }
    return element
  }
  content(dom: Element): Element {
    return dom
  }
}
