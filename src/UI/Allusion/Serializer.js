// @flow

import { serializer, MarkdownSerializer } from "../Markdown/Serializer"
import schema from "./Schema"
import header from "./Parser/header"

const nodes = Object.assign({}, serializer.nodes, {
  header(state, node) {
    state.write("/ ")
    state.text(node.textContent, false)
    state.closeBlock(node)
  },
  anchor(state, node) {
    state.write("[")
    state.renderInline(node)
  },
  address(state, node) {
    state.write(`](`)
    state.renderInline(node)
    state.write(")")
  },
  url(state, node) {
    state.write(node.textContent)
  },
  title(state, node) {
    state.write(state.quote(node.textContent))
  },
  words(state, node) {
    state.renderInline(node)
  }

  // {
  //   open: "[",
  //   close(state, mark) {
  //     return (
  //       "](" +
  //       state.esc(mark.attrs.href) +
  //       (mark.attrs.title ? " " + state.quote(mark.attrs.title) : "") +
  //       ")"
  //     )
  //   }
  // },
})

const marks = Object.assign({}, serializer.marks, {
  strike_through: {
    open: "~~",
    close: "~~",
    mixable: true,
    expelEnclosingWhitespace: true
  },
  code: {
    open: "`",
    close: "`",
    mixable: false,
    isCode: true
  }
})

export default new MarkdownSerializer(nodes, marks)
