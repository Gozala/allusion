// @flow

import { Schema } from "prosemirror-model"
import markdownSchema from "../Markdown/Schema"

const customNodes = {
  // root: {
  //   content: "(block|article)*"
  // },
  // article: {
  //   defining: true,
  //   group: "article",
  //   inline: false,
  //   content: "header (block|article)*",
  //   toDOM() {
  //     return ["article", {}, 0]
  //   },
  //   parseDOM: [{ tag: "article" }]
  // },
  header: {
    defining: true,
    marks: "_",
    group: "block",
    content: "text*",
    inline: false,
    toDOM() {
      return ["header", {}, 0]
    },
    parseDOM: [{ tag: "header" }]
  },

  checkbox: {
    group: "inline",
    inline: true,
    attrs: {
      type: { default: "checkbox" },
      checked: { default: null },
      disabled: {},
      id: { default: null }
    },
    parseDOM: [
      {
        tag: `input[type="checkbox"]`,
        getAttrs(node: HTMLElement) {
          return {
            type: node.getAttribute("type"),
            checked: node.getAttribute("checked"),
            disabled: node.getAttribute("disabled"),
            id: node.getAttribute("id")
          }
        }
      }
    ],
    toDOM(node) {
      return ["input", node.attrs]
    }
  },
  label: {
    group: "inline",
    inline: true,
    content: "inline*",
    attrs: {
      for: { default: null }
    },
    parseDOM: [
      {
        tag: "label",
        getAttrs(node: HTMLElement) {
          return {
            for: node.getAttribute("for")
          }
        }
      }
    ],
    toDOM(node) {
      return ["label", node.attrs, 0]
    }
  },
  anchor: {
    inline: true,
    group: "inline",
    content: "text*",
    selectable: true,
    defining: true,

    attrs: {
      "data-prefix": { default: "[" },
      "data-suffix": { default: "]" },
      href: {},
      title: { default: null }
    },
    parseDOM: [
      {
        tag: "a[href]",
        getAttrs(dom) {
          return {
            href: dom.getAttribute("href"),
            title: dom.getAttribute("title")
          }
        }
      }
    ],
    toDOM(node) {
      return ["a", node.attrs, 0]
    }
  }
}

const append = markdownSchema.spec.nodes.append

const nodes =
  typeof append === "function"
    ? append.call(markdownSchema.spec.nodes, customNodes)
    : Object.assign({}, markdownSchema.spec.nodes, customNodes)

export const schema = new Schema({
  // topNode: "root",
  nodes,
  marks: markdownSchema.spec.marks
})

// Workaround this issue:
// https://github.com/ProseMirror/prosemirror-markdown/issues/3
Object((schema.marks: any)).code.isCode = true

export default schema
