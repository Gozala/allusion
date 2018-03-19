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

export const diff = <t: Transform>(
  before: Node,
  after: Node,
  tr: t,
  index: number = 0,
  cursorPosition: ?number = null
): t => {
  let changes = new Delta(tr, index)
  const delta = diffSource(encode(before), encode(after), cursorPosition)

  let offsetBefore = 0
  let offsetAfter = 0
  changes = changes.enterNode()
  for (const [op, content] of delta) {
    const size: number = content.length
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
        const nodeBefore = before.nodeAt(offsetBefore)
        const nodeAfter = after.nodeAt(offsetAfter)

        const nodeSize = Math.min(
          nodeBefore ? nodeBefore.nodeSize : 0,
          nodeAfter ? nodeAfter.nodeSize : 0
        )

        const sliceBefore = before.slice(offsetBefore, offsetBefore + size)
        const sliceAfter = after.slice(offsetAfter, offsetAfter + size)
        if (sliceBefore.content.eq(sliceAfter.content)) {
          changes.retain(size)
        } else {
          changes.delete(size).insert(sliceAfter.content)
        }
        offsetBefore += size
        offsetAfter += size
        break
      }
    }
  }
  return changes.tr
}

const enterNode = (index: number) => index + 1
const insertFragment = (index: number, fragment: Fragment) => {}

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
  delete(size: number): Delta<t> {
    this.tr = this.tr.delete(this.index, this.index + size)
    return this
  }
  retain(size: number) {
    this.index += size
    return this
  }
}

class NodeIterator {
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

export const diff2 = <t: Transform>(
  before: Node,
  after: Node,
  tr: t,
  index: number = 0,
  cursorPosition: ?number = null
): t => {
  let changes = new Delta(tr, index)
  const delta = diffSource(encode(before), encode(after), cursorPosition)
  const nodesBefore = new NodeIterator(before)
  const nodesAfter = new NodeIterator(after)
  for (const [op, content] of delta) {
    const size: number = content.length
  }
  return changes.tr
}
