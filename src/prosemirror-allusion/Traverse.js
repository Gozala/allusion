// @flow strict

import type { ResolvedPos, Fragment, Node, Mark } from "../prosemirror-model/src/index.js"

class Return<a> {
  value: a
  constructor(value: a) {
    this.value = value
  }
}

export interface Visitor<a> {
  text(Node, a): Return<a> | a;
  node(Node, a): Return<a> | a;
  enter(Node, a): Return<a> | a;
  exit(Node, a): Return<a> | a;
}

export const traverse = <state>(
  visitor: Visitor<state>,
  init: state,
  node: Node,
  from: number = 0,
  to: number = node.content.size
): state =>
  from < to
    ? traverseForward(visitor, init, node, from, to)
    : traverseBackward(visitor, init, node, to, from)

traverse.return = <a>(state: a): Return<a> => new Return(state)

const traverseForward = <state>(
  visitor: Visitor<state>,
  init: state,
  root: Node,
  from: number,
  to: number
): state => {
  let node = root
  let offset = -1
  let index = 0
  let stack = [root]
  let result = init
  while (offset < to) {
    if (stack.length === 0) {
      return result
    } else {
      const node = stack.shift()
      if (node == null) {
        const node = stack.shift()
        if (node == null) {
          throw RangeError("Invalid stack should not contain subsequent null")
        }
        if (offset >= from) {
          const next = visitor.exit(node, result)
          if (next instanceof Return) {
            return next.value
          } else {
            result = next
          }
        }
        offset += 1
      } else {
        const { nodeSize, isText } = node
        if (isText) {
          if (offset >= from) {
            const next = visitor.text(node, result)
            if (next instanceof Return) {
              return next.value
            } else {
              result = next
            }
          }
          offset += nodeSize
        } else if (nodeSize <= 1) {
          if (offset >= from) {
            const next = visitor.node(node, result)
            if (next instanceof Return) {
              return next.value
            } else {
              result = next
            }
          }
          offset += nodeSize
        } else {
          if (offset >= from) {
            const next = visitor.enter(node, result)
            offset += 1
            if (next instanceof Return) {
              stack.unshift(null, node)
              offset += node.content.size
              result = next.value
            } else {
              stack.unshift(...node.content.content, null, node)
              result = next
            }
          } else {
            offset += 1
            stack.unshift(...node.content.content, null, node)
          }
        }
      }
    }
  }
  return result
}

const traverseBackward = <state>(
  visitor: Visitor<state>,
  init: state,
  root: Node,
  from: number,
  to: number
): state => {
  let node = root
  let offset = to
  let index = 0
  let stack = [root]
  let result = init
  while (offset > from) {
    if (stack.length === 0) {
      return result
    } else {
      const node = stack.pop()
      if (node == null) {
        const node = stack.pop()
        if (node == null) {
          throw RangeError("Invalid stack should not contain subsequent null")
        }
        const next = visitor.exit(node, result)
        if (next instanceof Return) {
          return next.value
        } else {
          result = next
          offset -= 1
        }
      } else {
        const { nodeSize, isText } = node
        if (isText) {
          const next = visitor.text(node, result)
          if (next instanceof Return) {
            return next.value
          } else {
            result = next
            offset -= nodeSize
          }
        } else if (nodeSize <= 1) {
          const next = visitor.node(node, result)
          if (next instanceof Return) {
            return next.value
          } else {
            result = next
            offset -= nodeSize
          }
        } else {
          const next = visitor.enter(node, result)
          offset -= 1
          if (next instanceof Return) {
            stack.push(node, null)
            offset -= node.content.size
            result = next.value
          } else {
            stack.push(node, null, ...node.content.content)
            result = next
          }
        }
      }
    }
  }
  return result
}
