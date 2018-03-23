// @flow strict

// Horizontal rule

import { isSpace } from "markdown-it/lib/common/utils"
import type { StateBlock } from "markdown-it"

export default (
  state: StateBlock,
  startLine: number,
  endLine: number,
  silent: boolean
) => {
  var marker,
    cnt,
    ch,
    token,
    min = state.bMarks[startLine],
    pos = min + state.tShift[startLine],
    max = state.eMarks[startLine]

  // if it's indented more than 3 spaces, it should be a code block
  if (state.sCount[startLine] - state.blkIndent >= 4) {
    return false
  }

  marker = state.src.charCodeAt(pos++)

  // Check hr marker
  if (
    marker !== 0x2a /* * */ &&
    marker !== 0x2d /* - */ &&
    marker !== 0x5f /* _ */
  ) {
    return false
  }

  // markers can be mixed with spaces, but there should be at least 3 of them

  cnt = 1
  while (pos < max) {
    ch = state.src.charCodeAt(pos++)
    if (ch !== marker && !isSpace(ch)) {
      return false
    }
    if (ch === marker) {
      cnt++
    }
  }

  if (cnt < 3) {
    return false
  }

  if (silent) {
    return true
  }

  state.line = startLine + 1

  token = state.push("hr", "hr", 0)
  token.map = [startLine, state.line]
  token.markup =
    state.md.options.trim === false
      ? state.src.slice(min, max)
      : Array(cnt + 1).join(String.fromCharCode(marker))

  return true
}
