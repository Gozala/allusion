// @flow strict

import Schema from "../Markdown/Schema"
import type {
  AttributeParseRule,
  NodeParseRule,
  MarkParseRule
} from "../Markdown/Schema"
import { Link, Address, URL, Title, Words, Markup } from "./NodeView/Link"
import OrderedMap from "orderedmap"
import type {
  DOMOutputSpec,
  NodeSpec,
  MarkSpec,
  ParseRule,
  Node,
  SchemaSpec
} from "prosemirror-model"
import { Mark } from "prosemirror-model"

export class Block {
  content: string
  group: string
  selectable: boolean
  inline: boolean = false
  atom: boolean = false
  draggable: boolean
  code: boolean
  defining: boolean
  toDOM: (node: Node) => DOMOutputSpec
  parseDOM: ParseRule[]
  parseMarkdown: (AttributeParseRule | NodeParseRule<*>)[]
  attrs: Object

  static parseMarkdown = []
  static toDOM(node: Node) {
    return ["div", node.attrs, 0]
  }

  static attrs = Object.create(null)

  constructor(spec: NodeSpec) {
    this.content = spec.content || ""
    this.group = spec.group || ""
    this.selectable = spec.selectable || true
    this.draggable = spec.draggable || false
    this.defining = spec.defining || false
    this.code = spec.code || false
    this.attrs = spec.attrs || this.constructor.attrs
    this.toDOM = spec.toDOM || this.constructor.toDOM
    this.parseMarkdown = spec.parseMarkdown || this.constructor.parseMarkdown
  }
}

export class Inline {
  content: string
  group: string
  selectable: boolean
  inline: boolean = true
  atom: boolean
  draggable: boolean
  code: boolean
  defining: boolean
  toDOM: (node: Node) => DOMOutputSpec
  parseDOM: ParseRule[]
  parseMarkdown: (AttributeParseRule | NodeParseRule<*>)[]
  attrs: Object

  static toDOM(node: Node) {
    return ["span", node.attrs, 0]
  }
  static parseMarkdown = []

  static attrs = Object.create(null)

  constructor(spec: NodeSpec) {
    this.content = spec.content || ""
    this.group = spec.group || ""
    this.selectable = spec.selectable || true
    this.draggable = spec.draggable || false
    this.defining = spec.defining || false
    this.atom = spec.atom || false
    this.attrs = spec.attrs || this.constructor.attrs
    this.toDOM = spec.toDOM || this.constructor.toDOM
    this.parseMarkdown = spec.parseMarkdown || this.constructor.parseMarkdown
  }
}

export class EditBlock extends Block {}
export class EditNode extends Inline {}

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
        {
          type: "paragrpah"
        }
      ],
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
      }
    },
    paragraph: new EditBlock({
      content: "inline*",
      group: "block",
      parseDOM: [{ tag: "p" }],
      parseMarkdown: [{ type: "paragraph" }],
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
      parseMarkdown: [{ type: "blockquote" }],
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
      ]
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
          }
        }
      ]
    },

    text: {
      group: "inline",
      toDOM(node): string {
        return node.text || ""
      }
    },

    image: new EditNode({
      inline: true,
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
      ]
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
      ]
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
          getAttrs(node: Element) {
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
      ]
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
          getAttrs(node: Element) {
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
      ]
    },
    // link: new EditNode({
    //   inline: true,
    //   group: "inline",
    //   content: "inline+",
    //   // Otherwise node get's selected here and there.
    //   selectable: false,
    //   isolating: true,
    //   marks: "_",

    //   attrs: {
    //     href: {},
    //     title: { default: null },
    //     marked: { default: null }
    //   },
    //   parseDOM: [
    //     {
    //       tag: "a[href]",
    //       getAttrs(dom) {
    //         return {
    //           href: dom.getAttribute("href"),
    //           title: dom.getAttribute("title"),
    //           marked: dom.getAttribute("marked")
    //         }
    //       }
    //     }
    //   ],
    //   toDOM(node) {
    //     return ["a", node.attrs, 0]
    //   },
    //   parseMarkdown: [
    //     {
    //       type: "link",
    //       getAttrs(token) {
    //         return {
    //           href: token.attrGet("href"),
    //           title: token.attrGet("title")
    //         }
    //       },
    //       createNode(schema, attrs, content, marks) {
    //         const markup = [
    //           schema.mark("markup", {
    //             class: "inline markup"
    //           }),
    //           ...marks
    //         ]
    //         const title =
    //           attrs.title == null ? "" : JSON.stringify(String(attrs.title))
    //         const href = attrs.href || "#"

    //         return schema.node(
    //           "link",
    //           attrs,
    //           [
    //             schema.text("[", markup),
    //             ...content,
    //             schema.text("](", markup),
    //             schema.text(`${href} ${title}`, markup),
    //             schema.text(")", markup)
    //           ],
    //           marks
    //         )
    //       }
    //     }
    //   ]
    // }),
    expandedImage: new EditNode({
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
          { class: "image" },
          ["span", { class: "image markup" }, 0],
          ["span", { contenteditable: false }, ["img", node.attrs]]
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
          }
        }
      ]
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
                  class: "inline markup",
                  marks
                })
              ])
            ])
          }
        }
      ],
      toDOM() {
        return [
          "div",
          { class: "horizontal-rule expanded" },
          ["span", { class: "horizontal-rule-markup" }, 0],
          ["span", { contenteditable: false }, ["hr"]]
        ]
      }
    })
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
        marks: { default: Mark.none }
      },
      toDOM(node) {
        return [
          "u",
          {
            class: node.attrs.class,
            code: node.attrs.code,
            marks: node.attrs.marks.map(mark => mark.attrs.markup).join("/")
          },
          0
        ]
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
          getAttrs(token) {
            return {
              markup: token.markup
            }
          }
        }
      ]
    },
    link: {
      inclusive: false,
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
              href: token.attrGet("href"),
              title: token.attrGet("title")
            }
          },
          openMark(schema, attrs, marks) {
            return [
              schema.text("[", [
                schema.mark("markup", {
                  class: "inline markup",
                  marks
                })
              ])
            ]
          },
          closeMark(schema, attrs, marks) {
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
              schema.text("](", markup),
              schema.text(`${href} ${title}`, markup),
              schema.text(")", markup)
            ]
          },
          createMarkup(schema, attrs, marks) {
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
                schema.text(`${href} ${title}`, markup),
                schema.text(")", markup)
              ]
            ]
          }
          // createNode(schema, attrs, content, marks) {
          //   const markup = [
          //     schema.mark("markup", {
          //       class: "inline markup"
          //     }),
          //     ...marks
          //   ]
          //   const title =
          //     attrs.title == null ? "" : JSON.stringify(String(attrs.title))
          //   const href = attrs.href || "#"

          //   return schema.node(
          //     "link",
          //     attrs,
          //     [
          //       schema.text("[", markup),
          //       ...content,
          //       schema.text("](", markup),
          //       schema.text(`${href} ${title}`, markup),
          //       schema.text(")", markup)
          //     ],
          //     marks
          //   )
          // }
        }
      ]
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
      ]
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
      ]
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
      ]
    }
  }
})
