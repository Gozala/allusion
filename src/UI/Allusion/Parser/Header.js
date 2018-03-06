// @flow strict

import type { StateBlock, Token } from "markdown-it"
export const SLASH = "/".charCodeAt(0)

export const isSpace = (code: number) => {
  switch (code) {
    case 0x09:
    case 0x20:
      return true
  }
  return false
}

export default (
  state: StateBlock,
  startLine: number,
  endLine: number,
  silent: boolean
) => {
  var ch,
    level,
    tmp,
    token,
    pos = state.bMarks[startLine] + state.tShift[startLine],
    max = state.eMarks[startLine]

  // if it's indented more than 3 spaces, it should be a code block
  if (state.sCount[startLine] - state.blkIndent >= 4) {
    return false
  }

  ch = state.src.charCodeAt(pos)

  if (ch !== SLASH || pos >= max) {
    return false
  }

  ch = state.src.charCodeAt(++pos)

  if (pos < max && !isSpace(ch)) {
    return false
  }

  if (silent) {
    return true
  }

  // Let's cut tails like `    /  ` from the end of string

  max = state.skipSpacesBack(max, pos)
  tmp = state.skipCharsBack(max, SLASH, pos) // `/`
  if (tmp > pos && isSpace(state.src.charCodeAt(tmp - 1))) {
    max = tmp
  }

  state.line = startLine + 1

  token = state.push("header_open", "header", 1)
  token.markup = "/"
  token.map = [startLine, state.line]

  token = state.push("text", "", 0)
  token.content = state.src.slice(pos, max).trim()
  token.map = [startLine, state.line]
  token.children = []

  token = state.push("header_close", "header", -1)
  token.markup = "/"

  return true
}
