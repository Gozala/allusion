// @flow

import "codemirror/mode/javascript/javascript"
import "codemirror/lib/codemirror.css"
import "codemirror/lib/codemirror.css"

import { Plugin } from "prosemirror-state"
import CodeBlockView from "./CodeBlock/NodeView"
import keyDownHandler from "./CodeBlock/KeyDownHandler"

export default (): Plugin =>
  new Plugin({
    props: {
      handleKeyDown: keyDownHandler,
      nodeViews: {
        code_block: CodeBlockView.new
      }
    }
  })
