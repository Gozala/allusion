// @flow strict

import MarkdownIt from "markdown-it"
import { MarkdownParser } from "../Markdown/Parser"
import schema from "./Schema"
import Header from "./Parser/Header"
import TaskList from "./Parser/TaskList"
import Paragraph from "./Parser/Paragraph"
import Heading from "./Parser/Heading"
import HorizontalRule from "./Parser/HorizontalRule"
import { Fragment } from "prosemirror-model"

const tokenizer = new MarkdownIt({ html: false, trim: false, linkify: true })
// tokenizer.block.ruler.after("heading", "header", Header)
tokenizer.use(TaskList, { label: true, labelAfter: true, enabled: true })
tokenizer.block.ruler.at("paragraph", Paragraph)
tokenizer.block.ruler.at("heading", Heading)
tokenizer.block.ruler.at("hr", HorizontalRule)
tokenizer.block.ruler.disable("table")
tokenizer.linkify
  .add("dat:", {
    validate(text, offset, self) {
      const tail = text.slice(offset)
      if (self.re.src_hex == null) {
        self.re.src_hex = `(?:${self.re.src_xn}|${
          self.re.src_pseudo_letter
        }{1,64})`
      }

      if (self.re.dat == null) {
        self.re.dat = new RegExp(
          `^\\/\\/${self.re.src_hex}${self.re.src_host_terminator}${
            self.re.src_path
          }`,
          "i"
        )
      }

      if (self.re.dat.test(tail)) {
        return tail.match(self.re.dat)[0].length
      }
      return 0
    }
  })
  .add("ipfs:", "dat:")
  .add("ipns:", "dat:")
  .add("ipld:", "dat:")
  .add("ipld:", "dat:")

export default MarkdownParser.fromSchema(schema, tokenizer)
/*, {
  blockquote: MarkdownParser.node(schema.nodes.blockquote),
  paragraph: MarkdownParser.node(schema.nodes.paragraph),
  list_item: MarkdownParser.node(schema.nodes.list_item, tok => {
    return {
      class: tok.attrGet("class"),
      markup: tok.markup
    }
  }),
  bullet_list: MarkdownParser.node(schema.nodes.bullet_list, tok => {
    return {
      class: tok.attrGet("class"),
      markup: tok.markup
    }
  }),
  ordered_list: MarkdownParser.node(schema.nodes.ordered_list, tok => {
    return {
      class: tok.attrGet("class"),
      order: +tok.attrGet("order") || 1,
      markup: tok.markup
    }
  }),
  heading: MarkdownParser.custom(
    schema.nodes.heading,
    token => {
      return {
        level: +token.tag.slice(1),
        markup: token.markup
      }
    },
    (attrs, content, marks) => {
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
  ),
  header: MarkdownParser.node(schema.nodes.header),
  code_block: MarkdownParser.node(schema.nodes.code_block),
  fence: MarkdownParser.node(schema.nodes.code_block, tok => {
    return {
      params: tok.info || "",
      markup: tok.markup
    }
  }),
  hr: MarkdownParser.node(schema.nodes.horizontal_rule, token => {
    return {
      markup: token.markup
    }
  }),
  image: MarkdownParser.node(schema.nodes.image, tok => {
    const src = String(tok.attrGet("src"))
    const url = src.includes(":")
      ? src
      : `${window.location.href.replace(
          `${window.location.hostname}/`,
          ""
        )}/${src}`

    return {
      src: url,
      title: tok.attrGet("title") || null,
      alt: (tok.children[0] && tok.children[0].content) || null
    }
  }),
  hardbreak: MarkdownParser.node(schema.nodes.hard_break),
  checkbox_input: MarkdownParser.node(schema.nodes.checkbox, tok => ({
    checked: tok.attrGet("checked"),
    type: tok.attrGet("type"),
    id: tok.attrGet("id"),
    disabled: tok.attrGet("disabled")
  })),
  label: MarkdownParser.node(schema.nodes.label, tok => ({
    for: tok.attrGet("for")
  })),

  em: MarkdownParser.mark(schema.marks.em, token => {
    return {
      markup: token.markup
    }
  }),
  strong: MarkdownParser.mark(schema.marks.strong, token => {
    return {
      markup: token.markup
    }
  }),
  s: MarkdownParser.mark(schema.marks.strike_through, token => {
    return {
      markup: token.markup
    }
  }),
  link: MarkdownParser.custom(
    schema.nodes.link,
    token => {
      return {
        href: token.attrGet("href"),
        title: token.attrGet("title")
      }
    },
    (attrs, content, marks) => {
      const markup = [
        schema.mark("markup", {
          class: "inline markup"
        }),
        ...marks
      ]
      const title =
        attrs.title == null ? "" : JSON.stringify(String(attrs.title))
      const href = attrs.href || "#"

      return schema.node(
        "link",
        attrs,
        [
          schema.text("[", markup),
          ...content,
          schema.text("](", markup),
          schema.text(`${href} ${title}`, markup),
          schema.text(")", markup)
        ],
        marks
      )
    }
  ),
  // link: MarkdownParser.custom(
  //   schema.nodes.link,
  //   (token): { href: string, title: ?string } => {
  //     return {
  //       href: token.attrGet("href") || "#",
  //       title: token.attrGet("title")
  //     }
  //   },
  //   (attrs, content, marks) => {
  //     const { href, title } = attrs
  //     return link(schema, Fragment.from(content), href, title)
  //   }
  // ),
  code_inline: MarkdownParser.mark(schema.marks.code, token => {
    return {
      markup: token.markup
    }
  })
})
*/
