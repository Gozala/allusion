// @flow strict

import type {
  Mark,
  Node,
  Schema,
  NodeSpec,
  AttributeSpec
} from "prosemirror-model"

import { Fragment } from "prosemirror-model"
import {
  Decoration,
  DecorationSet,
  EditorView,
  type NodeView
} from "prosemirror-view"

export class View {
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
    const element = this.editor.root.createElement(tagName)
    if (className !== "") {
      element.classList.add(className)
    }
    return element
  }
  content(dom: Element): Element {
    return dom
  }
}

export class Inline extends View {
  static inline: boolean = true
  static marks: string = "_"
  static content: string = "text"
  static group: string = "inline"
}

export class Block extends View {
  static inline: boolean = false
  static marks: string = ""
  static content: string = "inline*"
  static group: string = "block"
}

export class Link extends Inline {
  static blotName = "anchor"
  static tagName = "a"
  static content = `words address`
  static attrs = {
    href: {},
    title: { default: null },
    mode: { default: "read" }
  }
  static parseDOM = [
    {
      tag: "a[href]",
      getAttrs(dom: Element) {
        return {
          href: dom.getAttribute("href"),
          title: dom.getAttribute("title")
        }
      }
    }
  ]
  static new(
    schema: Schema,
    content: Fragment,
    href: string,
    title: ?string
  ): Node {
    return schema.node(Link.blotName, { href, title }, [
      Words.new(schema, content),
      Address.new(schema, href, title)
    ])
  }

  prefix: string
  suffix: string
  render(node: Node, editor: EditorView) {
    const { href, title, mode } = node.attrs
    const element = super.render(node, editor)
    element.setAttribute("href", href)
    element.setAttribute("title", title)
    element.classList.add("edit")
    return element
  }
  // expand() {
  //   // this.dom.classList.remove("read")
  //   const { schema } = this.editor.state
  //   return this.editor.state.tr
  //     .insert(
  //       this.index + this.node.nodeSize - 1,
  //       schema.text(this.suffix, [schema.mark("markup")])
  //     )
  //     .insert(this.index + 1, schema.text(this.prefix, [schema.mark("markup")]))
  // }
  // collapse() {
  //   const { index, node, editor, prefix, suffix } = this
  //   return editor.state.tr
  //     .deleteRange(
  //       index + node.nodeSize - 1 - suffix.length,
  //       index + node.nodeSize
  //     )
  //     .deleteRange(index + 1, index + 1 + prefix.length)
  // }
  // update(node: Node) {
  //   if (node.type.name === "anchor") {
  //     const { dom, editor } = this
  //     const { mode, href, title } = node.attrs
  //     dom.classList.add(node.attrs.mode)
  //     dom.setAttribute("href", href)
  //     dom.setAttribute("title", title)

  //     if (node.attrs.mode !== this.node.attrs.mode) {
  //       const tr = mode === "read" ? this.collapse() : this.expand()
  //       this.node = node
  //       setTimeout(() => {
  //         editor.dispatch(tr)
  //       })
  //     } else {
  //       this.node = node
  //     }

  //     return true
  //   } else {
  //     return false
  //   }
  // }
}

export class Field extends Inline {
  static group = "field"
  static content = "text+"
  static isolating = true
}

export class Words extends Inline {
  static group = "inline"
  static content = "inline+"
  static blotName = "words"
  static tagName = "span"
  static className = "words"

  static new(schema: Schema, content: Fragment): Node {
    return schema.node(Words.blotName, null, content)
  }
}

export class Address extends Field {
  static content = "url title?"
  static tagName = "span"
  static blotName = "address"
  static className = "address"
  static new(schema: Schema, href: string, text?: ?string): Node {
    return schema.node(
      Address.blotName,
      null,
      text != null
        ? [url(schema, href), title(schema, text)]
        : url(schema, href)
    )
  }
}

export class URL extends Field {
  static tagName = "span"
  static blotName = "url"
  static className = "url"
  static new(schema: Schema, url: string): Node {
    return schema.node(URL.blotName, null, schema.text(url))
  }
}

export class Title extends Inline {
  static tagName = "span"
  static blotName = "title"
  static className = "title"
  static new(schema: Schema, title: string): Node {
    return schema.node(Title.blotName, null, schema.text(title))
  }
}

export const url = URL.new

export const title = Title.new

export const address = Address.new

export const link = Link.new

export const words = Words.new
