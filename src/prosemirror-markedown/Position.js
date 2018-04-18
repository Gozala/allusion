// @flow strict

import { Node, ResolvedPos } from "prosemirror-model"

export const textOffsetFromPosition = (root: Node, position: number) => {
  let node = root
  let index = -1
  let offset = 0
  let stack = [root]
  while (index < position) {
    if (stack.length === 0) {
      return null
    } else {
      const node = stack.shift()
      if (node === null) {
        index++
      } else {
        const { nodeSize, isText } = node
        if (isText) {
          if (position - index >= nodeSize) {
            index += nodeSize
            offset += nodeSize
          } else {
            offset += position - index
            index = position
          }
        } else if (nodeSize <= 1) {
          index += nodeSize
          offset += node.content.size
        } else {
          index++
          stack.unshift(...node.content.content, null)
        }
      }
    }
  }
  return offset
}

export const positionFromTextOffset = (root: Node, offset: number): ?number => {
  let node = root
  let position = -1
  let index = 0
  let stack = [root]
  while (index < offset) {
    if (stack.length === 0) {
      return null
    } else {
      const node = stack.shift()
      if (node === null) {
        position++
      } else {
        const { nodeSize, isText } = node
        if (isText) {
          if (offset - index >= nodeSize) {
            index += nodeSize
            position += nodeSize
          } else {
            position += offset - index
            index = offset
          }
        } else if (nodeSize <= 1) {
          index += node.content.size
          position += nodeSize
        } else {
          position++
          stack.unshift(...node.content.content, null)
        }
      }
    }
  }
  return position
}

type NodePosition = { node: Node, index: number }
export const nodePosition = (
  isDesiredNode: Node => boolean,
  anchor: ResolvedPos
): ?NodePosition => {
  const { doc, pos, textOffset } = anchor
  const node = doc.nodeAt(pos)
  if (node && isDesiredNode(node)) {
    return {
      node,
      index: pos - textOffset
    }
  }

  let depth = anchor.depth
  while (depth > 0) {
    const node = anchor.node(depth)
    if (isDesiredNode(node)) {
      return {
        node,
        index: anchor.start(depth) - 1
      }
    } else {
      depth--
    }
  }
  return null
}

export const resolvePosition = (
  isDesiredNode: Node => boolean,
  anchor: ResolvedPos
): ResolvedPos => {
  const { doc, pos, textOffset } = anchor
  const node = anchor.nodeAfter
  if (node && isDesiredNode(node)) {
    return anchor
  }

  let depth = anchor.depth
  while (depth > 0) {
    const node = anchor.node(depth)
    if (isDesiredNode(node)) {
      return doc.resolve(anchor.start(depth) - 1)
    } else {
      depth--
    }
  }

  return anchor
}
