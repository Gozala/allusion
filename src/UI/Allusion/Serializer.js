// @flow

import {
  MarkdownSerializer,
  defaultMarkdownSerializer
} from "prosemirror-markdown"
import schema from "./Schema"
import header from "./Parser/header"

const nodes = Object.assign({}, defaultMarkdownSerializer.nodes, {
  header(state, node) {
    state.write("/ ")
    state.text(node.textContent, false)
    state.closeBlock(node)
  }
})

const marks = Object.assign({}, defaultMarkdownSerializer.marks, {
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

export const serializer = new MarkdownSerializer(nodes, marks)
export default serializer
