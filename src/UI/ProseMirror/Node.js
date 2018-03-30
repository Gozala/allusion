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
