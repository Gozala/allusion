// @flow

import { Plugin } from "prosemirror-state"
import CodeInline from "./CodeInline"
import CodeBlock from "./CodeBlock"
import InlineNode from "./InlineNode"
import keyDownHandler from "./CodeBlock/KeyDownHandler"

export default (): Plugin =>
  new Plugin({
    props: {
      handleKeyDown: keyDownHandler,
      nodeViews: {
        code_block: CodeBlock.new,
        code_inline: CodeInline.new,
        strong: InlineNode.new,
        em: InlineNode.new,
        strike_through: InlineNode.new
      }
    }
  })
