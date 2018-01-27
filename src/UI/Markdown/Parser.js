// @flow

import { MarkdownParser, defaultMarkdownParser } from "prosemirror-markdown"
import schema from "./Schema"

const { tokenizer, tokens } = defaultMarkdownParser
export const parser = new MarkdownParser(schema, tokenizer, {
  blockquote: { block: "blockquote" },
  paragraph: { block: "paragraph" },
  list_item: { block: "list_item" },
  bullet_list: { block: "bullet_list" },
  ordered_list: {
    block: "ordered_list",
    getAttrs: tok => ({ order: +tok.attrGet("order") || 1 })
  },
  heading: {
    block: "heading",
    getAttrs: tok => ({ level: +tok.tag.slice(1) })
  },
  code_block: { block: "code_block" },
  fence: { block: "code_block", getAttrs: tok => ({ params: tok.info || "" }) },
  hr: { node: "horizontal_rule" },
  image: {
    node: "image",
    getAttrs: tok => ({
      src: tok.attrGet("src"),
      title: tok.attrGet("title") || null,
      alt: (tok.children[0] && tok.children[0].content) || null
    })
  },
  hardbreak: { node: "hard_break" },

  em: { mark: "em" },
  strong: { mark: "strong" },
  s: { mark: "strike_through" },
  link: {
    mark: "link",
    getAttrs: tok => ({
      href: tok.attrGet("href"),
      title: tok.attrGet("title") || null
    })
  },
  code_inline: { mark: "code" }
})
parser.tokenizer = new parser.tokenizer.constructor({ html: false })

export default parser
