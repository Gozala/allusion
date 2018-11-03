// @flow strict

import { Plugin } from "../prosemirror-state/src/index.js"
import {
  inputRules,
  wrappingInputRule,
  textblockTypeInputRule,
  smartQuotes,
  emDash,
  ellipsis
} from "../prosemirror-inputrules/src/index.js"

/*::
import type {Rule, RuleHandler} from "../prosemirror-inputrules/src/index.js"
import type {Schema, NodeType} from "../prosemirror-model/src/index.js"

interface InputRule extends Rule {
  +preventDefault?:boolean
}
*/

export class TheInputRule /*::implements InputRule*/ {
  /*::
  match:RegExp
  handler:RuleHandler
  preventDefault:boolean
  */
  constructor(match/*:RegExp*/, handler/*:RuleHandler*/, preventDefault/*:boolean*/ = true) {
    this.match = match
    this.handler = handler
    this.preventDefault = preventDefault
  }
}

const MAX_MATCH = 500

export const InputRules = ({rules}/*:{rules:InputRule[]}*/)/*:Plugin<null>*/ => {
  return new Plugin({
    state: {
      init() { return null },
      apply(tr, prev) {
        let stored = tr.getMeta(this)
        if (stored) return stored
        return tr.selectionSet || tr.docChanged ? null : prev
      }
    },

    props: {
      handleKeyDown(view, event) {
        const { state } = view
        if (event.key != "Enter") {
          return false
        } else if (!state.selection.empty) {
          return false
        } else {
          const position = state.selection.$to
          if (position.parent.type.spec.code) {
            return false
          } else {
            const { from, to } = state.selection
            return this.props.handleTextInput(view, from, to, "\n")
          //   const {parent, parentOffset} = position
          //   const from = Math.max(0, parentOffset - MAX_MATCH)
          //   const to = parentOffset
          //   const text = "\n"
          //   const textBefore = parent.textBetween(from, to, null, "\ufffc") + text
          //   for (const rule of rules) {
          //     let match = rule.match.exec(textBefore)
          //     let tr = match && rule.handler(state, match, from - match[0].length, to)
          //     if (!tr) continue
          //     view.dispatch(tr.setMeta(this, {transform: tr, from, to, text}))
          //     return rule.preventDefault || false
          //   }
          //   return false
          // }
          }
        }
      },
      handleTextInput(view, from, to, text) {
        let state = view.state, $from = state.doc.resolve(from)
        if ($from.parent.type.spec.code) return false
        let textBefore = $from.parent.textBetween(
          Math.max(0, $from.parentOffset - MAX_MATCH),
          $from.parentOffset,
          null,
          "\ufffc"
        ) + text
        for (const rule of rules) {
          let match = rule.match.exec(textBefore)
          let tr = match && rule.handler(state, match, from - (match[0].length - text.length), to)
          if (!tr) continue
          view.dispatch(tr.setMeta(this, {transform: tr, from, to, text}))
          return rule.preventDefault || false
        }
        return false
      }
    },

    isInputRules: true
  })
}


const textblockRule = (match/*:RegExp*/) => (nodeType/*:NodeType*/) =>
  textblockTypeInputRule(match, nodeType)

const wrappingRule = (match/*:RegExp*/) => (nodeType/*:NodeType*/) =>
  wrappingInputRule(match, nodeType)

export const blockQuoteRule = wrappingRule(/^\s*>\s$/)
export const orderedListRule = (nodeType/*:NodeType*/) => wrappingInputRule(
    /^(\d+)\.\s$/,
    nodeType,
    match => ({order: +match[1]}),
    (match, node) => node.childCount + node.attrs.order == +match[1]
  )

export const bulletListRule = wrappingRule(/^\s*([-+*])\s$/)
export const codeBlockRule = (nodeType/*:NodeType*/) =>
  textblockTypeInputRule(/^```(\S*)\n$/, nodeType, (match) => ({syntax:match[1] || ""}))

export const buildInputRules = (schema/*:Schema*/)/*:Plugin<null>*/ => {
  let type, rules = []
  if (type = schema.nodes.blockquote) rules.push(blockQuoteRule(type))
  if (type = schema.nodes.ordered_list) rules.push(orderedListRule(type))
  if (type = schema.nodes.bullet_list) rules.push(bulletListRule(type))
  if (type = schema.nodes.code_block) rules.push(codeBlockRule(type))
  return InputRules({rules})
}

export default buildInputRules