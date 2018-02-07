// @flow

import { Schema } from "prosemirror-model"
import markdownSchema from "../Markdown/Schema"

const customNodes = {
  // root: {
  //   content: "(block|article)*"
  // },
  // article: {
  //   defining: true,
  //   group: "article",
  //   inline: false,
  //   content: "header (block|article)*",
  //   toDOM() {
  //     return ["article", {}, 0]
  //   },
  //   parseDOM: [{ tag: "article" }]
  // },
  header: {
    defining: true,
    marks: "_",
    group: "block",
    content: "text*",
    inline: false,
    toDOM() {
      return ["header", {}, 0]
    },
    parseDOM: [{ tag: "header" }]
  }
}

const append = markdownSchema.spec.nodes.append

const nodes =
  typeof append === "function"
    ? append.call(markdownSchema.spec.nodes, customNodes)
    : Object.assign({}, markdownSchema.spec.nodes, customNodes)

export const schema = new Schema({
  // topNode: "root",
  nodes,
  marks: markdownSchema.spec.marks
})

// Workaround this issue:
// https://github.com/ProseMirror/prosemirror-markdown/issues/3
Object((schema.marks: any)).code.isCode = true

export default schema
