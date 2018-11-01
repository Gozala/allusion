// @flow strict

import Tokenizer from "../markdown-it/lib/index.js"
import Parser from "../prosemirror-marked/Parser.js"
import schema from "./Schema.js"
import Header from "./Parser/Header.js"
import TaskList from "./Parser/TaskList.js"
import Paragraph from "./Parser/Paragraph.js"
import Heading from "./Parser/Heading.js"
import HorizontalRule from "./Parser/HorizontalRule.js"
import { Fragment } from "../prosemirror-model/src/index.js"

const tokenizer = new Tokenizer({ html: false, trim: false, linkify: true })
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

export default Parser.fromSchema(schema, tokenizer)
