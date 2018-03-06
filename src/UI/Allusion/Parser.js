// @flow strict

import MarkdownIt from "markdown-it"
import { MarkdownParser } from "../Markdown/Parser"
import schema from "./Schema"
import Header from "./Parser/Header"
import TaskList from "./Parser/TaskList"

const tokenizer = new MarkdownIt({ html: false })
tokenizer.block.ruler.after("heading", "header", Header)
tokenizer.use(TaskList, { label: true, labelAfter: true, enabled: true })

export default new MarkdownParser(schema, tokenizer, {
  blockquote: { block: "blockquote" },
  paragraph: { block: "paragraph" },
  list_item: {
    block: "list_item",
    getAttrs(tok) {
      return {
        class: tok.attrGet("class"),
        markup: tok.markup
      }
    }
  },
  bullet_list: {
    block: "bullet_list",
    getAttrs(tok) {
      return {
        class: tok.attrGet("class"),
        markup: tok.markup
      }
    }
  },
  ordered_list: {
    block: "ordered_list",
    getAttrs(tok) {
      return {
        class: tok.attrGet("class"),
        order: +tok.attrGet("order") || 1,
        markup: tok.markup
      }
    }
  },
  heading: {
    block: "heading",
    getAttrs(tok) {
      return {
        level: +tok.tag.slice(1),
        markup: tok.markup
      }
    }
  },
  header: {
    block: "header"
  },
  code_block: { block: "code_block" },
  fence: {
    block: "code_block",
    getAttrs(tok) {
      return {
        params: tok.info || "",
        markup: tok.markup
      }
    }
  },
  hr: { node: "horizontal_rule" },
  image: {
    node: "image",
    getAttrs: tok => {
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
    }
  },
  hardbreak: { node: "hard_break" },
  checkbox_input: {
    node: "checkbox",
    getAttrs: tok => ({
      checked: tok.attrGet("checked"),
      type: tok.attrGet("type"),
      id: tok.attrGet("id"),
      disabled: tok.attrGet("disabled")
    })
  },
  label: {
    block: "label",
    getAttrs: tok => ({
      for: tok.attrGet("for")
    })
  },

  em: {
    mark: "em",
    getAttrs(token) {
      return {
        markup: token.markup
      }
    }
  },
  strong: {
    mark: "strong",
    getAttrs(token) {
      return {
        markup: token.markup
      }
    }
  },
  s: {
    mark: "strike_through",
    getAttrs(token) {
      return {
        markup: token.markup
      }
    }
  },
  link: {
    block: "anchor",
    getAttrs: tok => ({
      href: tok.attrGet("href"),
      title: tok.attrGet("title") || null
    })
  },
  code_inline: {
    mark: "code",
    getAttrs(token) {
      return {
        markup: token.markup
      }
    }
  }
})
