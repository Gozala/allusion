// @flow

import { serializer, MarkdownSerializer } from "../Markdown/Serializer"
import schema from "./Schema"
import header from "./Parser/header"

const nodes = Object.assign({}, serializer.nodes, {
  Markup(state, node) {},
  header(state, node) {
    state.write("/ ")
    state.text(node.textContent, false)
    state.closeBlock(node)
  },
  // anchor(state, node) {
  //   state.write("[")
  //   state.renderInline(node)
  // },
  anchor(state, node) {
    state.write(`[`)
    state.renderInline(node)
    state.write(`](`)
    state.write(state.esc(node.attrs.href))
    state.write(node.attrs.title ? " " + state.quote(node.attrs.title) : " ")
    state.write(")")
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
  },
  meta: {
    open: "",
    close: "",
    ignore: true
  }
})

export default new MarkdownSerializer(nodes, marks)
