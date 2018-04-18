// @flow strict

import type { Node, NodeType } from "prosemirror-model"

export const createFrom = (type: NodeType, node: Node): Node => {
  const { group } = type.spec
  if (group && group.includes(node.type.name)) {
    return type.createChecked(node.attrs, node.content, node.marks)
  } else {
    return node
  }
}

const leftBoundry = Object.freeze({ node: null, offset: 0 })
export const nodeBy = (
  root: Node,
  position: number,
  dir: -1 | 1
): { node: ?Node, offset: number } => {
  let offset = dir < 0 ? position + dir : position
  const { size } = root.content
  while (offset < size && offset >= 0) {
    const node = root.nodeAt(offset)
    if (node) {
      return { node, offset }
    } else {
      offset += dir
    }
  }
  return dir < 0 ? leftBoundry : { node: null, offset: size }
}
