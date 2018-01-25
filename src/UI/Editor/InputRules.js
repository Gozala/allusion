// @flow

import {
  inputRules,
  wrappingInputRule,
  textblockTypeInputRule,
  smartQuotes,
  emDash,
  ellipsis,
  InputRule
} from "prosemirror-inputrules"
import type { NodeType, Schema } from "prosemirror-model"

// : (NodeType) → InputRule
// Given a blockquote node type, returns an input rule that turns `"> "`
// at the start of a textblock into a blockquote.
export function blockQuoteRule(nodeType: NodeType) {
  return wrappingInputRule(/^\s*>\s$/, nodeType)
}

// : (NodeType) → InputRule
// Given a list node type, returns an input rule that turns a number
// followed by a dot at the start of a textblock into an ordered list.
export function orderedListRule(nodeType: NodeType) {
  return wrappingInputRule(
    /^(\d+)\.\s$/,
    nodeType,
    match => ({ order: +match[1] }),
    (match, node) => node.childCount + node.attrs.order == +match[1]
  )
}

// : (NodeType) → InputRule
// Given a list node type, returns an input rule that turns a bullet
// (dash, plush, or asterisk) at the start of a textblock into a
// bullet list.
export function bulletListRule(nodeType: NodeType) {
  return wrappingInputRule(/^\s*([-+*])\s$/, nodeType)
}

// : (NodeType) → InputRule
// Given a code block node type, returns an input rule that turns a
// textblock starting with three backticks into a code block.
export function codeBlockRule(nodeType: NodeType) {
  return textblockTypeInputRule(/^```$/, nodeType)
}

export const codeInlineRule = (nodeType: NodeType) =>
  new InputRule(/(?:^|[^`])(`[^`]+)$/, (state, match, start, end) => {
    let [input, insert] = match
    if (insert) {
      const offset = input.lastIndexOf(insert)
      insert += input.slice(offset + input.length)
      start += offset
      const cutOff = start - end
      if (cutOff > 0) {
        insert = match[0].slice(offset - cutOff, offset) + insert
        start = end
      }
    }
    const marks = state.doc.resolve(start).marks()
    const content = state.schema.text(insert.substr(1))
    const node = state.schema.node("code_inline", null, content, marks)
    const transact = state.tr.replaceWith(start, end, node)
    const { selection } = transact
    return transact
      .replaceSelectionWith(state.schema.text(" "), true)
      .setSelection(selection)
  })

export const wrappingMarkerRule = (pattern: RegExp, nodeType: NodeType) =>
  new InputRule(pattern, (state, match, start, end) => {
    let [input, insert] = match
    const marks = state.doc.resolve(start).marks()
    const content = state.schema.text(insert)
    const node = state.schema.node(nodeType, null, content, marks)
    const transaction = state.tr.replaceWith(start, end, node)
    const { selection } = transaction
    const space = state.schema.text(" ")
    return transaction.replaceSelectionWith(space, true).setSelection(selection)
  })

export const wrappingMarker = (pattern: RegExp) => (nodeType: NodeType) =>
  wrappingMarkerRule(pattern, nodeType)

export const strongRule = wrappingMarker(/\*\*([^\*]+)$/)
export const emRule = wrappingMarker(/\*([^\*]+)$/)
export const strikeRule = wrappingMarker(/\~\~([^\~]+)$/)

// : (NodeType, number) → InputRule
// Given a node type and a maximum level, creates an input rule that
// turns up to that number of `#` characters followed by a space at
// the start of a textblock into a heading whose level corresponds to
// the number of `#` signs.
export function headingRule(nodeType: NodeType, maxLevel: number) {
  return textblockTypeInputRule(
    new RegExp("^(#{1," + maxLevel + "})\\s$"),
    nodeType,
    match => ({ level: match[1].length })
  )
}

export const horizontalRule = (nodeType: NodeType) =>
  new InputRule(/^(—-)$/, (state, match, start, end) => {
    const node = state.schema.node("horizontal_rule", null)
    return state.tr.replaceWith(start, end, node)
  })

// : (Schema) → Plugin
// A set of input rules for creating the basic block quotes, lists,
// code blocks, and heading.
export default (schema: Schema) => {
  let rules = smartQuotes.concat(ellipsis, emDash)
  let type

  if ((type = schema.nodes.strong)) rules.push(strongRule(type))
  if ((type = schema.nodes.em)) rules.push(emRule(type))
  if ((type = schema.nodes.strike_through)) rules.push(strikeRule(type))
  // if ((type = schema.nodes.link)) rules.push(linkRule(type))
  if ((type = schema.nodes.code_inline)) rules.push(codeInlineRule(type))
  if ((type = schema.nodes.horizontal_rule)) rules.push(horizontalRule(type))
  if ((type = schema.nodes.blockquote)) rules.push(blockQuoteRule(type))
  if ((type = schema.nodes.ordered_list)) rules.push(orderedListRule(type))
  if ((type = schema.nodes.bullet_list)) rules.push(bulletListRule(type))
  if ((type = schema.nodes.code_block)) rules.push(codeBlockRule(type))
  if ((type = schema.nodes.heading)) rules.push(headingRule(type, 6))
  return inputRules({ rules })
}
