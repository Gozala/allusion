// @flow strict

import { Mark } from "../../prosemirror-model/src/index.js"

/*:: 
import type { Node } from "../../prosemirror-model/src/index.js"
*/

export const withoutTrailingNewline = (text /* : string */) /* : string */ =>
  text[text.length - 1] === "\n" ? text.slice(0, text.length - 1) : text

export const priority = /*::<a: { +priority?: number }>*/(
  { priority } /* : a */,
  fallback /* : number */ = 50
) => (priority == null ? fallback : priority)

export const insertByPriority = /*::<a: { +priority?: number }>*/(
  rule /* : a */,
  rules /* : a[] */,
  defaultPriority /* : number */ = 50
) /* : a[] */ => {
  const thisPriority = priority(rule, defaultPriority)
  const { length } = rules
  let index = 0

  while (index < length) {
    const next = rules[index]
    const nextPriority = priority(next, defaultPriority)
    if (nextPriority < thisPriority) {
      rules.splice(index, 0, rule)
      return rules
    } else {
      index += 1
    }
  }

  rules.push(rule)
  return rules
}

export const concat = (a /* : Node */, b /* : Node */) /* : ?Node */ => {
  if (a.isText && b.isText && Mark.sameSet(a.marks, b.marks)) {
    const _a/*:any*/ = a
    const _b/*:any*/ = b
    const fragment/*:string*/ = _a.text + _b.text
    return _a.copy(fragment)
  }
}
