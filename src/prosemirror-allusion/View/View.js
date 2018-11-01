// @flow strict

/*::
import type {
  Mark,
  Node,
  Schema,
  NodeSpec,
  AttributeSpec
} from "../../prosemirror-model/src/index.js"

import type { EditorView, NodeView } from "../../prosemirror-view/src/index.js"
*/

export default class View {
  /*::
  node: Node
  editor: EditorView
  dom: Element
  contentDOM: Element
  position: () => number

  static inline: boolean
  static marks: string
  static content: string
  static group: string
  static atom: boolean
  static selectable: boolean
  static draggable: boolean
  static code: boolean
  static defining: boolean
  static isolating: boolean
  static attrs: ?{ [string]: AttributeSpec }

  static blotName: string
  static tagName: string
  static className: string
  */
  constructor(node/* : Node */, editor/* : EditorView */, position/* : () => number */) {
    this.node = node
    this.position = position
    this.editor = editor
    this.dom = this.render(node, editor)
    this.contentDOM = this.content(this.dom)
  }
  init(node/* : Node */, editor/* : EditorView */) {}
  get index()/* : number */ {
    return this.position()
  }

  
  static toDOM(node/* : Node */) {
    return [this.tagName, node.attrs, 0]
  }
  static view() {
    const View = this
    return (
      node/* : Node */,
      editor/* : EditorView */,
      position/* : () => number */
    )/* : NodeView */ => {
      return new View(node, editor, position)
    }
  }
  render(node/* : Node */, editor/* : EditorView */)/* : Element */ {
    const { tagName, className } = this.constructor
    const { root } = this.editor
    const document = root.ownerDocument || root
    const element = document.createElement(tagName)
    if (className !== "") {
      element.classList.add(className)
    }
    return element
  }
  content(dom/* : Element */)/* : Element */ {
    return dom
  }
}

View.marks = ""
View.content = ""
View.group = ""
View.atom = false
View.selectable = true
View.draggable = false
View.code = false
View.defining = false
View.isolating = false
View.attrs = null
View.tagName = "meta"
View.className = ""
