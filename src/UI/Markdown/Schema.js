// @flow strict

import { Schema } from "prosemirror-model"

export const schema = new Schema({
  nodes: {
    "inline+": {
      content: "inline+"
    },
    "block+": {
      content: "block+"
    },
    doc: {
      content: "block+"
    },
    paragraph: {
      content: "inline*",
      group: "block",
      parseDOM: [{ tag: "p" }],
      toDOM() {
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
      parseDOM: [{ tag: "hr" }],
      toDOM() {
        return ["div", ["hr"]]
      }
    },
    heading: {
      attrs: { level: { default: 1 }, expand: { default: false }, markup: {} },
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
        return [
          "h" + node.attrs.level,
          {
            markup: node.attrs.markup
          },
          0
        ]
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
        title: { default: null }
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
    }
  },
  marks: {
    // em: {
    //   parseDOM: [{tag: "i"}, {tag: "em"},
    //              {style: "font-style", getAttrs: value => value == "italic" && null}],
    //   toDOM() { return ["em"] }
    // },

    // strong: {
    //   parseDOM: [{tag: "b"}, {tag: "strong"},
    //              {style: "font-weight", getAttrs: value => /^(bold(er)?|[5-9]\d{2,})$/.test(value) && null}],
    //   toDOM() { return ["strong"] }
    // },

    // link: {
    //   attrs: {
    //     href: {},
    //     title: {default: null}
    //   },
    //   inclusive: false,
    //   parseDOM: [{tag: "a[href]", getAttrs(dom) {
    //     return {href: dom.getAttribute("href"), title: dom.getAttribute("title")}
    //   }}],
    //   toDOM(node) { return ["a", node.attrs] }
    // },

    // code: {
    //   parseDOM: [{tag: "code"}],
    //   toDOM() { return ["code"] }
    // },

    code: {
      // inline: true,
      code: true,
      group: "inline code",
      // content: "text*",
      // selectable: true,

      // excludes: "_",
      attrs: {
        markup: { default: "`" }
      },
      parseDOM: [{ tag: "code" }],
      toDOM(node) {
        return ["code", node.attrs]
      }
    },
    markup: {
      inline: true,
      group: "inline markup",
      content: "text+",
      selectable: true,
      inclusive: false,
      markup: true,
      attrs: {
        class: { default: "markup" }
      },
      toDOM(node) {
        return ["span", node.attrs, 0]
      }
    },
    meta: {
      inline: true,
      group: "inline markup",
      content: "text+",
      selectable: true,
      inclusive: false,
      markup: true,
      attrs: {
        class: { default: "markup code" }
      },
      toDOM(node) {
        return ["span", node.attrs, 0]
      }
    },
    strong: {
      inline: true,
      group: "inline",
      content: "inline*",
      selectable: true,
      defining: true,
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
      inline: true,
      group: "inline",
      content: "inline*",
      selectable: true,
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
      inline: true,
      group: "inline",
      content: "inline*",
      selectable: true,
      attrs: {
        markup: { default: "~~" }
      },

      parseDOM: [
        { tag: "del" },
        {
          style: "text-decoration",
          getAttrs: $ => $ === "line-through" && null
        }
      ],
      toDOM(node) {
        return ["del", node.attrs]
      }
    },
    link: {
      inline: true,
      group: "inline",
      content: "text*",
      selectable: true,
      defining: true,

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
    }
  }
})

export default schema
