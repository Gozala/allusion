// @flow strict

import { Schema } from "../prosemirror-marked/Schema.js"
import { EditBlock, EditNode } from "../prosemirror-marked/Schema.js"
import { Mark } from "../prosemirror-model/src/index.js"

/*::
import type {
  AttributeParseRule,
  NodeParseRule,
  MarkParseRule
} from "../prosemirror-marked/Schema.js"
import OrderedMap from "../orderedmap/index.js"
import type {
  DOMOutputSpec,
  NodeSpec,
  MarkSpec,
  ParseRule,
  Node,
  SchemaSpec
} from "../prosemirror-model/src/index.js"
*/

export default new Schema({
  nodes: {
    doc: {
      content: "header article",
      // content: "heading paragraph block+"
      serializeMarkdown(buffer, node) {
        return buffer.renderInline(node).closeBlock(node)
      }
    },
    header: {
      content: "title author",
      toDOM(node) {
        return ["header", 0]
      },
      serializeMarkdown(buffer, node) {
        return buffer.renderInline(node).closeBlock(node)
      }
    },
    title: new EditBlock({
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
      parseMarkdown: [
        // {
        //   type: "heading",
        //   tag: "h1"
        // }
      ],
      serializeMarkdown(buffer, node) {
        return buffer.write("# ").renderInline(node).closeBlock(node)
      },
      toDOM(node) {
        return ["h1", node.attrs, 0]
      }
    }),
    author: new EditBlock({
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
      parseMarkdown: [
        // i
      ],
      serializeMarkdown(buffer, node) {
        return buffer.renderInline(node).closeBlock(node)
      },
      toDOM(node) {
        return ["address", node.attrs, 0]
      }
    }),
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
      },
      serializeMarkdown(buffer, node) {
        return buffer.renderInline(node).closeBlock(node)
      }
    },
    paragraph: new EditBlock({
      content: "inline*",
      group: "block",
      parseDOM: [{ tag: "p" }],
      parseMarkdown: [{ type: "paragraph" }],
      serializeMarkdown(buffer, node, parent) {
        const { nodes } = node.type.schema
        switch (parent.type || null) {
          case nodes.list_item:
            return buffer.renderContent(node)
          default:
            return buffer.renderInline(node).closeBlock(node)
        }
      },
      attrs: {
        marked: {
          default: null
        }
      },
      toDOM(node) {
        return ["p", 0]
      }
    }),
    blockquote: {
      content: "block+",
      group: "block",
      parseDOM: [{ tag: "blockquote" }],
      parseMarkdown: [
        {
          type: "blockquote"
          // TODO: At the moment when paragraph with content `paragrpah(> foo)` is
          // parsed it produces `blockquote(foo)` which confuses selection restore
          // logic in `EditRange.updateMarkup` as text offset no longer correponds
          // in a new node due to missing `> ` characters. This can be resolved by
          // adding `> ` markup in front of each child node like it's done in
          // list-item.
        }
      ],
      serializeMarkdown(buffer, node) {
        return buffer.wrapBlock("> ", null, node, node =>
          buffer.renderContent(node)
        )
      },
      toDOM(node) {
        return ["blockquote", 0]
      }
    },
    horizontal_rule: new EditBlock({
      group: "block",
      attrs: {
        markup: { default: "---" },
        marked: { default: null }
      },
      parseDOM: [{ tag: "hr" }],
      parseMarkdown: [{ type: "hr" }],
      serializeMarkdown(buffer, node) {
        return buffer.write(node.attrs.markup || "---").closeBlock(node)
      },
      toDOM() {
        return ["div", { class: "horizontal-rule" }, ["hr"]]
      }
    }),
    heading: new EditBlock({
      attrs: {
        level: { default: 1 },
        markup: { default: "#" },
        marked: { default: null }
      },
      content: "inline*",
      group: "block",
      defining: true,
      parseMarkdown: [
        {
          type: "heading",
          getAttrs(token) {
            return {
              level: +token.tag.slice(1),
              markup: token.markup
            }
          },
          createNode(schema, attrs, content, marks) {
            return schema.node(
              "heading",
              attrs,
              [
                schema.text(`${attrs.markup} `, [
                  schema.mark("markup", {
                    class: "block markup heading"
                  })
                ]),
                ...content
              ],
              marks
            )
          }
        }
      ],
      serializeMarkdown(buffer, node) {
        return buffer.renderInline(node).closeBlock(node)
      },
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
    }),
    code_block: {
      content: "text*",
      group: "block",
      code: true,
      defining: true,
      attrs: { params: { default: "" } },
      parseMarkdown: [
        { type: "code_block" },
        {
          type: "fence",
          tag: "code",
          getAttrs(token) {
            return {
              params: token.info || "",
              markup: token.markup
            }
          }
        }
      ],
      serializeMarkdown(buffer, node) {
        return buffer
          .write("```" + node.attrs.params + "\n")
          .text(node.textContent, false)
          .ensureNewLine()
          .write("```")
          .closeBlock(node)
      },
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
      parseMarkdown: [
        {
          type: "ordered_list",
          getAttrs(token) {
            return {
              class: token.attrGet("class"),
              order: +token.attrGet("order") || 1,
              markup: token.markup
            }
          }
        }
      ],
      serializeMarkdown(buffer, node) {
        const start = node.attrs.order || 1
        const maxW = String(start + node.childCount - 1).length
        const space = buffer.repeat(" ", maxW + 2)
        return buffer.renderList(node, space, (child, i) => {
          const nStr = String(start + i)
          return buffer.repeat(" ", maxW - nStr.length) + nStr + ". "
        })
      },
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
      },
      parseMarkdown: [
        {
          type: "bullet_list",
          getAttrs(token) {
            return {
              class: token.attrGet("class"),
              markup: token.markup
            }
          }
        }
      ],
      serializeMarkdown(buffer, node) {
        return buffer.renderList(node, "  ", item => "")
      }
    },

    list_item: {
      content: "paragraph block*",
      defining: true,
      attrs: { markup: { default: "-" } },
      parseDOM: [{ tag: "li" }],
      toDOM() {
        return ["li", 0]
      },
      parseMarkdown: [
        {
          type: "list_item",
          getAttrs(token) {
            return {
              class: token.attrGet("class"),
              markup: token.markup
            }
          },
          createNode(schema, attributes, content, marks) {
            return schema.node("list_item", attributes, [
              schema.node("paragraph", null, [
                schema.text(`${attributes.markup} `, [
                  schema.mark("markup", {
                    class: "list markup",
                    marks
                  })
                ])
              ]),
              ...content
            ])
          }
        }
      ],
      serializeMarkdown(buffer, node) {
        return buffer.renderContent(node)
      }
    },

    text: {
      group: "inline",
      toDOM(node)/* : string */ {
        return node.text || ""
      },
      serializeMarkdown(buffer, node) {
        return buffer.text(node.text, false)
      }
    },

    image: new EditNode({
      inline: true,
      selectable: true,
      attrs: {
        src: {},
        alt: { default: null },
        title: { default: null },
        marked: { default: null }
      },
      content: "inline*",
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
      },
      parseMarkdown: [
        {
          type: "image",
          getAttrs(token) {
            return {
              src: token.attrGet("src"),
              title: token.attrGet("title") || null,
              alt: (token.children[0] && token.children[0].content) || null
            }
          }
        }
      ],
      serializeMarkdown(buffer, node) {
        return buffer.write(
          "![" +
            buffer.escape(node.attrs.alt || "") +
            "](" +
            buffer.escape(node.attrs.src) +
            (node.attrs.title ? " " + buffer.quote(node.attrs.title) : " ") +
            ")"
        )
      }
    }),

    hard_break: {
      inline: true,
      group: "inline",
      selectable: false,
      parseDOM: [{ tag: "br" }],
      toDOM() {
        return ["br"]
      },
      parseMarkdown: [
        {
          type: "hardbreak"
        }
      ],
      serializeMarkdown(buffer, node, parent, index) {
        for (let i = index + 1; i < parent.childCount; i++) {
          if (parent.child(i).type != node.type) {
            return buffer.write("\\\n")
          }
        }
        return buffer
      }
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
          getAttrs(node/* : Element */) {
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
      },
      parseMarkdown: [
        {
          type: "checkbox_input",
          getAttrs(token) {
            return {
              checked: token.attrGet("checked"),
              type: token.attrGet("type"),
              id: token.attrGet("id"),
              disabled: token.attrGet("disabled")
            }
          }
        }
      ],
      serializeMarkdown(buffer, node) {
        const status = node.attrs.checked == null ? "[ ]" : "[x]"
        return buffer.write(status).renderContent(node)
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
          getAttrs(node/* : Element */) {
            return {
              for: node.getAttribute("for")
            }
          }
        }
      ],
      toDOM(node) {
        return ["label", node.attrs, 0]
      },
      parseMarkdown: [
        {
          type: "label",
          getAttrs(token) {
            return {
              for: token.attrGet("for")
            }
          }
        }
      ],
      serializeMarkdown(buffer, node) {
        return buffer.renderInline(node)
      }
    },
    expandedImage: new EditNode({
      inline: true,
      isolating: true,
      group: "inline",
      content: "text*",
      selectable: true,
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
          { class: "image" },
          ["span", { class: "image markup" }, 0],
          [
            "span",
            { class: "image container", contenteditable: false },
            ["img", node.attrs]
          ]
        ]
      },
      parseMarkdown: [
        {
          priority: 51,
          type: "image",
          getAttrs(token) {
            return {
              src: token.attrGet("src"),
              title: token.attrGet("title") || null,
              alt: (token.children[0] && token.children[0].content) || null
            }
          },
          createNode(schema, attributes, content, marks) {
            const { src, alt } = attributes
            const title = attributes.title ? `"${attributes.title}"` : ""

            return schema.node(
              "expandedImage",
              attributes,
              [schema.text(`![${alt}](${src} ${title})`, marks)],
              marks
            )
          }
        }
      ],
      serializeMarkdown(buffer, node) {
        return buffer.write(node.textContent)
      }
    }),
    expandedHorizontalRule: new EditBlock({
      group: "block",
      content: "text*",
      attrs: {
        markup: { default: "---" },
        marked: { default: "" }
      },
      parseMarkdown: [
        {
          type: "hr",
          priority: 51,
          getAttrs(token) {
            return {
              markup: token.markup
            }
          },
          createNode(schema, attributes, content, marks) {
            return schema.node("expandedHorizontalRule", attributes, [
              schema.text(attributes.markup, [
                schema.mark("markup", {
                  class: "horizontal-rule markup",
                  marks
                })
              ])
            ])
          }
        }
      ],
      serializeMarkdown(buffer, node) {
        return buffer.write(node.textContent)
      },
      toDOM() {
        return [
          "div",
          { class: "horizontal-rule" },
          ["span", { class: "horizontal-rule-markup" }, 0],
          [
            "span",
            { class: "horizontal-rule-line", contenteditable: false },
            ["hr"]
          ]
        ]
      }
    })
  },
  marks: {
    markup: {
      group: "markup code",
      inclusive: false,
      // excludes: "_",
      attrs: {
        class: { default: "markup" },
        code: { default: null },
        marks: { default: Mark.none }
      },
      toDOM(node) {
        return [
          "span",
          {
            class: node.attrs.class,
            code: node.attrs.code,
            marks: node.attrs.marks.map(mark => mark.attrs.markup).join("/")
          },
          0
        ]
      },
      serializeMarkdown: {
        open: "",
        close: ""
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
      },
      parseMarkdown: [
        {
          type: "code_inline",
          createMarkup(schema, attrs, marks) {
            return [
              [
                schema.text(attrs.markup, [
                  schema.mark("markup", {
                    class: "inline code markup open",
                    marks
                  })
                ])
              ],
              0,
              [
                schema.text(attrs.markup, [
                  schema.mark("markup", {
                    class: "inline code markup close",
                    marks
                  })
                ])
              ]
            ]
          },
          getAttrs(token) {
            return {
              markup: token.markup
            }
          }
        }
      ],
      serializeMarkdown: {
        open: "",
        close: "",
        mixable: false
      }
    },
    link: {
      inclusive: false,
      attrs: {
        href: {},
        auto: { default: false },
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
      },
      parseMarkdown: [
        {
          type: "link",
          getAttrs(token) {
            return {
              auto: token.info === "auto",
              href: token.attrGet("href"),
              title: token.attrGet("title")
            }
          },
          createMarkup(schema, attrs, marks) {
            if (attrs.auto) {
              return [[], 0, []]
            }

            const markup = [
              schema.mark("markup", {
                class: "inline markup",
                marks
              })
            ]

            const title =
              attrs.title == null ? "" : JSON.stringify(String(attrs.title))
            const href = attrs.href || "#"

            return [
              [schema.text("[", markup)],
              0,
              [
                schema.text("](", markup),
                schema.text(`${href}`, [
                  schema.mark("markup", {
                    class: "inline url markup",
                    marks
                  })
                ]),
                schema.text(` ${title}`, [
                  schema.mark("markup", {
                    class: "inline title markup",
                    marks
                  })
                ]),
                schema.text(")", markup)
              ]
            ]
          }
        }
      ],
      serializeMarkdown: {
        open: "",
        close: ""
        // open(state, mark) {
        //   return `[`
        // },
        // close(state, mark) {
        //   const url = state.escape(mark.attrs.href)
        //   const title = mark.attrs.title ? state.quote(mark.attrs.title) : ""
        //   return `](${url} ${title})`
        // }
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
      },
      parseMarkdown: [
        {
          type: "strong",
          getAttrs(token) {
            return {
              markup: token.markup
            }
          }
        }
      ],
      serializeMarkdown: {
        // open(state, mark) {
        //   return mark.attrs.markup
        // },
        // close(state, mark) {
        //   return mark.attrs.markup
        // },
        open: "",
        close: "",
        mixable: true
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
      },
      parseMarkdown: [
        {
          type: "em",
          getAttrs(token) {
            return {
              markup: token.markup
            }
          }
        }
      ],
      serializeMarkdown: {
        mixable: true,
        open: "",
        close: ""
        // open(state, mark) {
        //   return mark.attrs.markup
        // },
        // close(state, mark) {
        //   return mark.attrs.markup
        // }
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
      },
      parseMarkdown: [
        {
          type: "s",
          getAttrs(token) {
            return {
              markup: token.markup
            }
          }
        }
      ],
      serializeMarkdown: {
        // open(state, mark) {
        //   return mark.attrs.markup
        // },
        // close(state, mark) {
        //   return mark.attrs.markup
        // },
        open: "",
        close: "",
        mixable: true
      }
    }
  }
})