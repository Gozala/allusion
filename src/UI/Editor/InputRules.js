// @flow strict

import {
  wrappingInputRule,
  textblockTypeInputRule,
  smartQuotes,
  emDash,
  ellipsis
} from "prosemirror-inputrules"

import { inputRules, InputRule } from "../ProseMirror/InputRules"

// import { toggleMark } from "prosemirror-commands"
import type {
  NodeType,
  MarkType,
  Mark,
  Schema,
  EditorState,
  Transaction,
  Range,
  Node
} from "prosemirror-state"

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
  new InputRule(/(?:^|[^`])(`[^`]+)$/, (state, match, from, to) => {
    let start = from
    const end = to
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

// export const strongRule = wrappingMarker(/\*\*([^\*]+)$/)
// export const emRule = wrappingMarker(/\*([^\*]+)$/)
// export const strikeRule = wrappingMarker(/\~\~([^\~]+)$/)

export const markerRule = (pattern: RegExp, markType: MarkType) =>
  new InputRule(
    pattern,
    (state: EditorState, match: string[], start: number, end: number) => {
      const { schema, tr, doc } = state
      const [input, insert] = match
      const marks = doc.resolve(start).marks()
      const content = schema.text(insert, [...marks, schema.mark(markType)])
      // const node = state.schema.node(nodeType, null, content, marks)
      const transaction = tr.replaceWith(start, end, content)
      // const { selection } = transaction
      // const space = state.schema.text(" ")
      // return transaction.replaceSelectionWith(space, true).setSelection(selection)
      return transaction
    }
  )

export const makeMarker = (pattern: RegExp) => (markType: MarkType) =>
  markerRule(pattern, markType)

const markApplies = (doc: Node, ranges: Range[], type: MarkType) => {
  for (let i = 0; i < ranges.length; i++) {
    let { $from, $to } = ranges[i]
    let can = $from.depth == 0 ? doc.type.allowsMarkType(type) : false
    doc.nodesBetween($from.pos, $to.pos, node => {
      if (can) return false
      can = node.inlineContent && node.type.allowsMarkType(type)
    })
    if (can) return true
  }
  return false
}

const Mark$excludes = (marks: Mark[], markType: MarkType): boolean => {
  for (let mark of marks) {
    if (mark.type.excludes(markType)) {
      return true
    }
  }
  return false
}

export const toggleMark = (
  tr: Transaction,
  markType: MarkType,
  attrs: ?{}
): ?Transaction => {
  let { empty, $cursor } = tr.selection
  if (!empty) {
    return null
  } else if (!$cursor) {
    return null
  } else {
    const marks = $cursor.marks()
    if (markType.isInSet(tr.storedMarks || marks)) {
      return tr.removeStoredMark(markType)
    } else if (!Mark$excludes(marks, markType)) {
      return tr.addStoredMark(markType.create(attrs))
    } else {
      return null
    }
  }
}

class MarkerRule {
  match: RegExp
  markType: MarkType
  static match(match: RegExp) {
    return (markType: MarkType) => this.new(match, markType)
  }
  static new(match: RegExp, markType: MarkType) {
    return new MarkerRule(match, markType)
  }
  constructor(match: RegExp, markType: MarkType) {
    this.match = match
    this.markType = markType
  }
  handler(
    state: EditorState,
    match: string[],
    start: number,
    end: number
  ): ?Transaction {
    const { schema, tr, doc } = state
    const [input] = match
    return toggleMark(tr.delete(start, end), this.markType)
  }
}

var re = (strings: string[], ...keys: string[]) => {
  const [pattern, flags] = String.raw(
    (strings: any),
    ...keys.map(escape)
  ).split("/")
  return new RegExp(pattern, flags)
}

var escape = string => string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

class MarkRule {
  markup: string
  match: RegExp
  markType: MarkType
  preventDefault: boolean
  static match(markup: string) {
    return (markType: MarkType) => this.new(markup, markType)
  }
  static new(markup: string, markType: MarkType) {
    return new MarkRule(markup, markType)
  }
  constructor(
    markup: string,
    markType: MarkType,
    preventDefault: boolean = true
  ) {
    this.markup = markup
    this.match = re`${markup}(.+)${markup}$`
    this.markType = markType
    this.preventDefault = preventDefault
  }
  handler(
    state: EditorState,
    match: string[],
    start: number,
    end: number
  ): ?Transaction {
    const { markType, markup } = this
    const { schema, tr, doc } = state
    const [input, content] = match
    return tr
      .replaceWith(
        start,
        end,
        schema.text(content, [markType.create({ markup })])
      )
      .removeStoredMark(markType)
    // .addMark(start, end, markType.create())
    // .delete(end - markup.length + 1, end)
    // .delete(start, start + markup.length)
  }
}

export const strongMarkRule = MarkRule.match("**")
export const codeMarkRule = MarkRule.match("`")
export const strikeMarkRule = MarkRule.match("~~")
export const emMarkRule = MarkRule.match("_")
export const emMarkRule2 = MarkRule.match("*")

// : (NodeType, number) → InputRule
// Given a node type and a maximum level, creates an input rule that
// turns up to that number of `#` characters followed by a space at
// the start of a textblock into a heading whose level corresponds to
// the number of `#` signs.
export function headingRule(nodeType: NodeType, maxLevel: number) {
  return textblockTypeInputRule(
    new RegExp("^(#{1," + maxLevel + "})\\s$"),
    nodeType,
    match => ({ level: match[1].length, markup: match[1] })
  )
}

export const horizontalRule = (nodeType: NodeType) =>
  new InputRule(/^(—-)$/, (state, match, start, end) => {
    const node = state.schema.node("horizontal_rule", null)
    return state.tr.replaceWith(start, end, node)
  })

export const headerRule = (nodeType: NodeType) =>
  // new InputRule(/^\/\s$/, (state, match, start, end) => {
  //   // console.log('!!!!!!!!!!!!!!!')
  //   const node = //state.schema.node("article", null, [
  //     state.schema.node("header")
  //   // ])
  //   return state.tr.replaceWith(start - 1, end + 1, node)
  // })
  textblockTypeInputRule(/^\/\s$/, nodeType)

// : (Schema) → Plugin
// A set of input rules for creating the basic block quotes, lists,
// code blocks, and heading.
export default (schema: Schema) => {
  let rules = smartQuotes.concat(ellipsis, emDash)
  let type
  if ((type = schema.nodes.code_block)) rules.push(codeBlockRule(type))

  if ((type = schema.marks.strong)) rules.push(strongMarkRule(type))
  if ((type = schema.marks.em)) rules.push(emMarkRule(type), emMarkRule2(type))
  if ((type = schema.marks.code)) rules.push(codeMarkRule(type))
  if ((type = schema.marks.strike_through)) rules.push(strikeMarkRule(type))

  // if ((type = schema.nodes.header)) rules.push(headerRule(type))
  // if ((type = schema.nodes.strong)) rules.push(strongRule(type))
  // if ((type = schema.nodes.em)) rules.push(emRule(type))
  // if ((type = schema.nodes.strike_through)) rules.push(strikeRule(type))
  // // if ((type = schema.nodes.link)) rules.push(linkRule(type))
  if ((type = schema.nodes.code_inline)) rules.push(codeInlineRule(type))
  if ((type = schema.nodes.horizontal_rule)) rules.push(horizontalRule(type))
  if ((type = schema.nodes.blockquote)) rules.push(blockQuoteRule(type))
  if ((type = schema.nodes.ordered_list)) rules.push(orderedListRule(type))
  if ((type = schema.nodes.bullet_list)) rules.push(bulletListRule(type))
  if ((type = schema.nodes.heading)) rules.push(headingRule(type, 6))
  return inputRules({ rules })
}
