// @flow

import { Schema } from "prosemirror-model"
import Markdown from "../Markdown/Schema"
import { Link, Address, URL, Title, Words, Markup } from "./NodeView/Link"
import OrderedMap from "orderedmap"

export const schema = new Schema({
  // topNode: "root",
  nodes: OrderedMap.from(Markdown.spec.nodes).append({
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
    // [Link.blotName]: Link,
    // [Address.blotName]: Address,
    // [URL.blotName]: URL,
    // [Title.blotName]: Title,
    // [Words.blotName]: Words,
    // [Markup.blotName]: Markup,
    anchor: {
      inline: true,
      group: "inline",
      content: "inline+",
      selectable: true,
      marks: "_",

      attrs: {
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
    },
    expandedImage: {
      inline: true,
      isolating: true,
      group: "inline",
      content: "text*",
      draggable: false,
      attrs: {
        src: {},
        alt: { default: null },
        title: { default: null }
      },
      parseDOM: [
        {
          tag: "img[src]",
          getAttrs(dom) {
            return {
              src: dom.getAttribute("src"),
              title: dom.getAttribute("title"),
              alt: dom.getAttribute("alt")
            }
          }
        }
      ],
      toDOM(node) {
        return [
          "picture",
          { class: "image expanded" },
          ["img", node.attrs],
          ["span", { class: "image-markup" }, 0]
        ]
      }
    },
    expandedHorizontalRule: {
      group: "block",
      content: "text*",
      attrs: {
        markup: { default: "---" }
      },
      toDOM() {
        return [
          "div",
          { class: "horizontal-rule expanded" },
          ["hr"],
          ["span", { class: "horizontal-rule-markup" }, 0]
        ]
      }
    },
    Markup: {
      inline: true,
      markup: true,
      group: "inline text markup",
      content: "text*",
      attrs: {
        class: { default: "markup code Markup" }
      },
      toDOM(node) {
        return ["span", node.attrs, 0]
      }
    }
  }),
  marks: OrderedMap.from(Markdown.spec.marks).prepend({
    markup: {
      inline: true,
      group: "inline markup",
      content: "text*",
      selectable: true,
      inclusive: false,
      markup: true,
      attrs: {
        class: { default: "markup" }
      },
      toDOM(node) {
        return ["span", node.attrs, 0]
      }
    }
  })
})

// Workaround this issue:
// https://github.com/ProseMirror/prosemirror-markdown/issues/3
Object((schema.marks: any)).code.isCode = true

export default schema
