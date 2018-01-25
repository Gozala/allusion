// @flow

import { Schema } from "prosemirror-model"
import { schema } from "prosemirror-markdown"

export default new Schema({
  nodes: schema.spec.nodes.append({
    code_inline: {
      inline: true,
      code: true,
      group: "inline",
      content: "text*",
      selectable: true,
      attrs: {
        "data-prefix": { default: "`" },
        "data-suffix": { default: "`" }
      },
      parseDOM: [{ tag: "code" }],
      toDOM(node) {
        return ["code", node.attrs, 0]
      }
    },
    strong: {
      inline: true,
      group: "inline",
      content: "inline*",
      selectable: true,
      attrs: {
        "data-prefix": { default: "**" },
        "data-suffix": { default: "**" }
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
        return ["strong", node.attrs, 0]
      }
    },
    em: {
      inline: true,
      group: "inline",
      content: "inline*",
      selectable: true,
      attrs: {
        "data-prefix": { default: "*" },
        "data-suffix": { default: "*" }
      },

      parseDOM: [
        { tag: "i" },
        { tag: "em" },
        { style: "font-style", getAttrs: value => value == "italic" && null }
      ],
      toDOM(node) {
        return ["em", node.attrs, 0]
      }
    },
    strike_through: {
      inline: true,
      group: "inline",
      content: "inline*",
      selectable: true,
      attrs: {
        "data-prefix": { default: "~~" },
        "data-suffix": { default: "~~" }
      },

      parseDOM: [
        { tag: "del" },
        {
          style: "text-decoration",
          getAttrs: $ => $ === "line-through" && null
        }
      ],
      toDOM(node) {
        return ["del", node.attrs, 0]
      }
    }
    // link: {
    //   name: "link",
    //   tagName: "a",
    //   inline: true,
    //   group: "inline",
    //   content: "inline*",
    //   selectable: true,

    //   attrs: {
    //     "data-prefix": { default: "[" },
    //     "data-suffix": { default: "]" },
    //     href: {},
    //     title: { default: null }
    //   },
    //   inclusive: false,
    //   parseDOM: [{
    //     tag: "a[href]", getAttrs(dom) {
    //       return {
    //         href: dom.getAttribute("href"),
    //         title: dom.getAttribute("title")
    //       }
    //     }
    //   }],
    //   toDOM(node) { return ["a", node.attrs] }
    // }
  }),
  marks: {
    link: schema.spec.marks.get("link")
  }
})
