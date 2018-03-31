// @flow strict

import ChangeList from "./ChangeList"
import { Fragment, Node, Schema, Mark } from "prosemirror-model"
import type { Transaction } from "prosemirror-state"
import { isMarkupNode } from "./Marks"

export const collapseRange = (
  tr: Transaction,
  range: { index: number, length: number }
): Transaction => {
  const { selection, doc } = tr
  const { content } = doc.slice(range.index, range.index + range.length)
  const changeList = ChangeList.new(range.index, tr)
  return collapseFragment(content, changeList).toTransaction()
}

export const collapseFragment = (
  content: Fragment,
  changeList: ChangeList
): ChangeList => {
  let index = 0
  let changes = changeList
  const count = content.childCount
  while (index < count) {
    changes = collapseNode(content.child(index), changes)
    index += 1
  }
  return changes
}

export const collapseNode = (
  node: Node,
  changeList: ChangeList
): ChangeList => {
  if (isMarkupNode(node)) {
    return changeList.deleteNode(node)
  } else {
    const { nodes } = node.type.schema
    switch (node.type) {
      case nodes.text: {
        return collapseText(node, changeList)
      }
      case nodes.expandedImage: {
        return collapseImage(node, changeList)
      }
      case nodes.expandedHorizontalRule: {
        return collapseHorizontalRule(node, changeList)
      }
      default: {
        changeList.enterUnmarked(node)
        collapseFragment(node.content, changeList)
        return changeList.exitNode()
      }
    }
  }
}

export const collapseText = (
  node: Node,
  changeList: ChangeList
): ChangeList => {
  return changeList.retainUnmarked(node)
}

export const collapseImage = (
  node: Node,
  changeList: ChangeList
): ChangeList => {
  const image = node.type.schema.node(
    "image",
    node.attrs,
    undefined,
    node.marks
  )
  return changeList.deleteNode(node).insertNode(image)
}

export const collapseHorizontalRule = (
  node: Node,
  changeList: ChangeList
): ChangeList => {
  const collapsedNode = node.type.schema.node(
    "horizontal_rule",
    node.attrs,
    undefined,
    node.marks
  )
  return changeList.deleteNode(node).insertNode(collapsedNode)
}
