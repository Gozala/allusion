// @flow

import { Schema } from "prosemirror-model"
import schema from "../Markdown/Schema"

export default new Schema({
  topNode: "root",
  nodes: schema.spec.nodes.append({
    root: {
      content: "(block|article)*"
    },
    article: {
      defining: true,
      group: "article",
      inline: false,
      content: "header (block|article)*",
      toDOM() {
        return ["article", {}, 0]
      },
      parseDOM: [{ tag: "article" }]
    },
    header: {
      defining: true,
      marks: "_",
      group: "header",
      content: "text*",
      inline: false,
      toDOM() {
        return ["header", {}, 0]
      },
      parseDOM: [{ tag: "header" }]
    }
  }),
  marks: schema.spec.marks
})
