// @flow

import { Schema } from "prosemirror-model"
import Markdown from "../Markdown/Schema"
import { Link, Address, URL, Title, Words, Markup } from "./NodeView/Link"
import OrderedMap from "orderedmap"

export default new Schema({
  nodes: {
    doc: {
      content: "header article"
      // content: "heading paragraph block+"
    },
    header: {
      content: "title author",
      toDOM(node) {
        return ["header", 0]
      }
    },
    title: {
      content: "inline*",
      group: "heading paragraph",
      defining: true,
      attrs: {
        markup: { default: "" },
        marked: { default: null },
        placeholder: { default: "Title" },
        label: { default: "Title" },
        tabindex: { default: 0 }
      },
      toDOM(node) {
        return ["h1", node.attrs, 0]
      }
    },
    author: {
      content: "inline*",
      defining: true,
      group: "paragraph",
      attrs: {
        markup: { default: "" },
        marked: { default: null },
        placeholder: { default: "Your name" },
        label: { default: "Author" },
        tabindex: { default: 0 }
      },
      toDOM(node) {
        return ["address", node.attrs, 0]
      }
    },
    article: {
      content: "block+",
      attrs: {
        placeholder: {
          default: "Your story..."
        },
        tabindex: { default: 0 }
      },
      toDOM(node) {
        return ["article", node.attrs, 0]
      }
    },
    paragraph: {
      content: "inline*",
      group: "block",
      parseDOM: [{ tag: "p" }],
      attrs: {
        marked: {
          default: null
        }
      },
      toDOM(node) {
        return ["p", 0]
      }
    },
    blockquote: {
      content: "block+",
      group: "block",
      parseDOM: [{ tag: "blockquote" }],
      toDOM() {
        return ["blockquote", 0]
      }
    },
    horizontal_rule: {
      group: "block",
      attrs: {
        markup: { default: "---" },
        marked: { default: null }
      },
      parseDOM: [{ tag: "hr" }],
      toDOM() {
        return ["div", { class: "horizontal-rule" }, ["hr"]]
      }
    },
    heading: {
      attrs: {
        level: { default: 1 },
        markup: { default: "#" },
        marked: { default: null }
      },
      content: "inline*",
      group: "block",
      defining: true,
      parseDOM: [
        { tag: "h1", attrs: { level: 1 } },
        { tag: "h2", attrs: { level: 2 } },
        { tag: "h3", attrs: { level: 3 } },
        { tag: "h4", attrs: { level: 4 } },
        { tag: "h5", attrs: { level: 5 } },
        { tag: "h6", attrs: { level: 6 } }
      ],
      toDOM(node) {
        return ["h" + node.attrs.level, 0]
      }
    },
    code_block: {
      content: "text*",
      group: "block",
      code: true,
      defining: true,
      attrs: { params: { default: "" } },
      parseDOM: [
        {
          tag: "pre",
          preserveWhitespace: true,
          getAttrs(node) {
            return {
              params: node.getAttribute("data-params")
            }
          }
        }
      ],
      toDOM(node) {
        return [
          "pre",
          node.attrs.params ? { "data-params": node.attrs.params } : {},
          ["code", 0]
        ]
      }
    },
    ordered_list: {
      content: "list_item+",
      group: "block",
      attrs: { order: { default: 1 }, tight: { default: false } },
      parseDOM: [
        {
          tag: "ol",
          getAttrs(dom) {
            return {
              order: dom.hasAttribute("start") ? +dom.getAttribute("start") : 1,
              tight: dom.hasAttribute("data-tight")
            }
          }
        }
      ],
      toDOM(node) {
        return [
          "ol",
          {
            start: node.attrs.order == 1 ? null : node.attrs.order,
            "data-tight": node.attrs.tight ? "true" : null
          },
          0
        ]
      }
    },

    bullet_list: {
      content: "list_item+",
      group: "block",
      attrs: { tight: { default: false } },
      parseDOM: [
        {
          tag: "ul",
          getAttrs: dom => ({ tight: dom.hasAttribute("data-tight") })
        }
      ],
      toDOM(node) {
        return ["ul", { "data-tight": node.attrs.tight ? "true" : null }, 0]
      }
    },

    list_item: {
      content: "paragraph block*",
      defining: true,
      attrs: { markup: { default: "-" } },
      parseDOM: [{ tag: "li" }],
      toDOM() {
        return ["li", 0]
      }
    },

    text: {
      group: "inline",
      toDOM(node): string {
        return node.text || ""
      }
    },

    image: {
      inline: true,
      attrs: {
        src: {},
        alt: { default: null },
        title: { default: null },
        marked: { default: null }
      },
      group: "inline",
      draggable: true,
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
        return ["img", node.attrs]
      }
    },

    hard_break: {
      inline: true,
      group: "inline",
      selectable: false,
      parseDOM: [{ tag: "br" }],
      toDOM() {
        return ["br"]
      }
    },
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
    // header: {
    //   defining: true,
    //   marks: "_",
    //   group: "block",
    //   content: "text*",
    //   inline: false,
    //   toDOM() {
    //     return ["header", {}, 0]
    //   },
    //   parseDOM: [{ tag: "header" }]
    // },

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
    link: {
      inline: true,
      group: "inline",
      content: "inline+",
      // Otherwise node get's selected here and there.
      selectable: false,
      marks: "_",

      attrs: {
        href: {},
        title: { default: null },
        marked: { default: null }
      },
      parseDOM: [
        {
          tag: "a[href]",
          getAttrs(dom) {
            return {
              href: dom.getAttribute("href"),
              title: dom.getAttribute("title"),
              marked: dom.getAttribute("marked")
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
        title: { default: null },
        marked: { default: "" }
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
          ["span", { class: "image-markup" }, 0],
          ["span", { contenteditable: false }, ["img", node.attrs]]
        ]
      }
    },
    expandedHorizontalRule: {
      group: "block",
      content: "text*",
      attrs: {
        markup: { default: "---" },
        marked: { default: "" }
      },
      toDOM() {
        return [
          "div",
          { class: "horizontal-rule expanded" },
          ["span", { class: "horizontal-rule-markup" }, 0],
          ["span", { contenteditable: false }, ["hr"]]
        ]
      }
    }
  },
  marks: {
    edit: {
      group: "edit",
      inclusive: false,
      attrs: {
        edit: { default: true }
      },
      toDOM(node) {
        return ["span", 0]
      }
    },
    markup: {
      group: "markup code",
      inclusive: false,
      // excludes: "_",
      attrs: {
        class: { default: "markup" },
        code: { default: null },
        marks: { default: "" }
      },
      toDOM(node) {
        return ["u", node.attrs, 0]
      }
    },
    code: {
      group: "inline code",
      excludes: "_",
      attrs: {
        markup: { default: "`" }
      },
      parseDOM: [{ tag: "code" }],
      toDOM(node) {
        return ["code", node.attrs]
      }
    },
    strong: {
      group: "inline",
      attrs: {
        markup: { default: "**" }
      },
      parseDOM: [
        { tag: "b" },
        { tag: "strong" },
        {
          style: "font-weight",
          getAttrs: value => /^(bold(er)?|[5-9]\d{2,})$/.test(value) && null
        }
      ],
      toDOM(node) {
        return ["strong", node.attrs]
      }
    },
    em: {
      group: "inline",
      attrs: {
        markup: { default: "_" }
      },
      parseDOM: [
        { tag: "i" },
        { tag: "em" },
        { style: "font-style", getAttrs: value => value == "italic" && null }
      ],
      toDOM(node) {
        return ["em", node.attrs]
      }
    },
    strike_through: {
      group: "inline",
      attrs: {
        markup: { default: "~~" }
      },
      parseDOM: [
        { tag: "del" },
        { tag: "s" },
        {
          style: "text-decoration",
          getAttrs: $ => $ === "line-through" && null
        }
      ],
      toDOM(node) {
        return ["del", node.attrs]
      }
    }
  }
})
