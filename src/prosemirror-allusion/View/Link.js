// @flow strict


import { Fragment } from "../../prosemirror-model/src/index.js"
import {
  Decoration,
  DecorationSet,
  EditorView
} from "../../prosemirror-view/src/index.js"

import Inline from "./Inline.js"

import type { NodeView } from "../../prosemirror-view/src/index.js"
import type {
  Mark,
  Node,
  Schema,
  NodeSpec,
  AttributeSpec
} from "../../prosemirror-model/src/index.js"

export class Link extends Inline {
  static blotName = "link"
  static tagName = "a"
  static content = `Markup words Markup address Markup`
  static attrs = {
    href: {},
    title: { default: null },
    class: { default: "link" }
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
      Markup.new(schema, "["),
      Words.new(schema, content),
      Markup.new(schema, "]("),
      Address.new(schema, href, title),
      Markup.new(schema, ")")
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
  stopEvent() {
    return true
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
  //   if (node.type.name === "link") {
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
  static isolating = false
  static attrs = { class: { default: "words" } }

  static new(schema: Schema, content: Fragment): Node {
    return schema.node(Words.blotName, null, content)
  }
}

export class Address extends Field {
  static content = "url title?"
  static tagName = "span"
  static blotName = "address"
  static className = "address"
  static attrs = { class: { default: "address" } }
  static new(schema: Schema, href: string, text?: ?string): Node {
    const content =
      text == null
        ? url(schema, href)
        : [url(schema, href), title(schema, text)]

    return schema.node(Address.blotName, null, content)
  }
}

export class URL extends Field {
  static tagName = "span"
  static blotName = "url"
  static className = "url"
  static attrs = { class: { default: "url" } }
  static new(schema: Schema, url: string): Node {
    return schema.node(URL.blotName, null, schema.text(url))
  }
}

export class Title extends Inline {
  static tagName = "span"
  static blotName = "title"
  static className = "title"
  static attrs = { class: { default: "title" } }
  static new(schema: Schema, title: string): Node {
    return schema.node(Title.blotName, null, schema.text(title))
  }
}

export class Markup extends Inline {
  static atom = true
  static group = "markup"
  static content = ""
  static isolating = true
  static selectable = false
  static tagName = "span"
  static className = "markup"
  static blotName = "Markup"
  static attrs = {
    class: { default: "markup" },
    markup: { default: "" }
  }
  static new(schema: Schema, markup: string): Node {
    return schema.node(this.blotName, {
      markup: markup,
      class: "markup"
    })
  }
  render(node: Node, editor: EditorView) {
    const element = super.render(node, editor)
    element.textContent = node.attrs.markup
    element.setAttribute("contenteditable", "false")
    return element
  }
}

export const url = URL.new

export const title = Title.new

export const address = Address.new

export const link = Link.new

export const words = Words.new
