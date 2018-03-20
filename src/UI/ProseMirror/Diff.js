// @flow

import diffSource from "fast-diff"
import type { Node, Fragment, Slice, Schema } from "prosemirror-model"
import type { Transaction } from "prosemirror-state"
import type { Transform } from "prosemirror-transform"

const NODE_OPEN = "<" //String.fromCharCode(1)
const NODE_CLOSE = ">" //String.fromCharCode(0)
const { DELETE, INSERT, EQUAL } = diffSource

export { diffSource }

export const encode = (root: Node): string => {
  let text = ""
  let depth = 0
  root.descendants((node, pos, parent) => {
    if (pos > text.length) {
      depth--
      text += NODE_CLOSE
    }
    if (node.content.size > 0) {
      depth++
      text += NODE_OPEN
    } else {
      text += node.textContent
    }
  })
  if (depth > 0) {
    text += NODE_CLOSE
  }
  return text
}

class Delta<t: Transform> {
  tr: t
  index: number
  constructor(tr: t, index: number) {
    this.tr = tr
    this.index = index
  }
  enterNode(): Delta<t> {
    this.index + 1
    return this
  }
  exitNode(): Delta<t> {
    this.index + 1
    return this
  }
  insert(content: Fragment): Delta<t> {
    this.tr = this.tr.insert(this.index, content)
    this.index += content.size
    return this
  }
  insertNode(node: Node): Delta<t> {
    this.tr = this.tr.insert(this.index, node)
    this.index += node.nodeSize
    return this
  }
  delete(size: number): Delta<t> {
    this.tr = this.tr.delete(this.index, this.index + size)
    return this
  }
  retain(size: number): Delta<t> {
    this.index += size
    return this
  }
}

export class NodeIterator {
  nodePosition: number
  textOffset: number
  stack: Array<?Node>
  constructor(root: Node) {
    this.stack = [root]
    this.nodePosition = -1
    this.textOffset = 0
  }
  next(): ?Node {
    while (this.stack.length > 0) {
      const node = this.stack.pop()
      if (node == null) {
        this.nodePosition++
      } else {
        const { nodeSize, isText } = node
        if (isText) {
          this.textOffset += nodeSize
          this.nodePosition += nodeSize
          return node
        } else if (nodeSize <= 1) {
          this.textOffset += node.content.size
          this.nodePosition += nodeSize
          return node
        } else {
          this.nodePosition += 1
          this.stack.unshift(...node.content.content, null)
          return node
        }
      }
    }
    return null
  }
}

export const diff = <t: Transform>(
  before: Node,
  after: Node,
  tr: t,
  cursorPosition: ?number = null,
  index: number = 0
): t => {
  let changes = new Delta(tr, index)
  const delta = diffSource(encode(before), encode(after), cursorPosition)
  const nodesBefore = new NodeIterator(before)
  const nodesAfter = new NodeIterator(after)
  let offsetBefore = 0
  let offsetAfter = 0
  for (const [op, content] of delta) {
    const size = content.length
    switch (op) {
      case INSERT: {
        if (content === NODE_OPEN) {
          offsetAfter += size
        } else {
          const { content } = after.slice(offsetAfter, offsetAfter + size)
          changes = changes.insert(content)
          offsetAfter += size
        }
        break
      }
      case DELETE: {
        changes = changes.delete(size)
        offsetBefore += size
        break
      }
      case EQUAL: {
        const fragmentBefore = before.slice(offsetBefore, offsetBefore + size)
          .content
        const fragmentAfter = after.slice(offsetAfter, offsetAfter + size)
          .content

        const from = fragmentBefore.findDiffStart(fragmentAfter)
        const to = fragmentBefore.findDiffEnd(fragmentAfter)
        if (from && to) {
          changes = changes
            .retain(from)
            .delete(to.a - from)
            .insert(after.slice(offsetAfter + from, offsetAfter + to.b).content)
          offsetBefore += to.a
          offsetAfter += to.b
        } else {
          changes = changes.retain(size)
          offsetBefore += size
          offsetAfter += size
        }
        break
      }
    }
  }
  return changes.tr
}
