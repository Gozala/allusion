// @flow strict

import MarkdownIt from "markdown-it"
import { MarkdownParser } from "../Markdown/Parser"
import schema from "./Schema"
import Header from "./Parser/Header"
import TaskList from "./Parser/TaskList"
import Paragraph from "./Parser/Paragraph"
import Heading from "./Parser/Heading"
import { link } from "./NodeView/Link"
import { Fragment } from "prosemirror-model"

const tokenizer = new MarkdownIt({ html: false, trim: false })
tokenizer.block.ruler.after("heading", "header", Header)
tokenizer.use(TaskList, { label: true, labelAfter: true, enabled: true })
tokenizer.block.ruler.at("paragraph", Paragraph)
tokenizer.block.ruler.at("heading", Heading)

export default new MarkdownParser(schema, tokenizer, {
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
  heading: MarkdownParser.node(schema.nodes.heading, tok => {
    return {
      level: +tok.tag.slice(1),
      markup: tok.markup
    }
  }),
  header: MarkdownParser.node(schema.nodes.header),
  code_block: MarkdownParser.node(schema.nodes.code_block),
  fence: MarkdownParser.node(schema.nodes.code_block, tok => {
    return {
      params: tok.info || "",
      markup: tok.markup
    }
  }),
  hr: MarkdownParser.node(schema.nodes.horizontal_rule),
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
  link: MarkdownParser.node(schema.nodes.anchor, token => {
    return {
      href: token.attrGet("href"),
      title: token.attrGet("title")
    }
  }),
  // link: MarkdownParser.custom(
  //   schema.nodes.anchor,
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
