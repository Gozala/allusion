// @flow strict

import Tokenizer from "markdown-it"
import Parser from "../../prosemirror-markedown/Parser"
import schema from "./Schema"
import Header from "./Parser/Header"
import TaskList from "./Parser/TaskList"
import Paragraph from "./Parser/Paragraph"
import Heading from "./Parser/Heading"
import HorizontalRule from "./Parser/HorizontalRule"
import { Fragment } from "prosemirror-model"

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
