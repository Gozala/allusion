// @flow strict

import ChangeList from "./ChangeList"
import { Fragment, Node, Schema, Mark } from "prosemirror-model"
import type { Transaction } from "prosemirror-state"

export const expand = (
  tr: Transaction,
  start: number,
  end: number
): Transaction => {
  const { content } = tr.doc.slice(start, end)
  const changeList = ChangeList.new(start, tr)

  return expandFragment(content, changeList).toTransaction()
}

export const expandRange = (
  tr: Transaction,
  range: { index: number, length: number }
): Transaction => expand(tr, range.index, range.index + range.length)

export const expandFragment = (
  content: Fragment,
  changeList: ChangeList
): ChangeList => {
  const count = content.childCount
  let index = 0
  let changes = changeList

  while (index < count) {
    const node = content.child(index)
    changes = expandNode(node, changes)
    index++
  }

  return changes
}

export const expandNode = (node: Node, changeList: ChangeList): ChangeList => {
  const { nodes } = node.type.schema
  switch (node.type) {
    case nodes.link: {
      return expandLink(node, changeList)
    }
    case nodes.heading: {
      return expandHeading(node, changeList)
    }
    case nodes.horizontal_rule: {
      return expandHorizontalRule(node, changeList)
    }
    case nodes.image: {
      return expandImage(node, changeList)
    }
    case nodes.text: {
      return expandText(node, changeList)
    }
    case nodes.author:
    case nodes.title:
    case nodes.paragraph: {
      return expandParagraph(node, changeList)
    }
    default: {
      return changeList.retainMarked(node)
    }
  }
}

export const expandLink = (node: Node, changeList: ChangeList) => {
  if (node.attrs.marked != null) {
    return changeList.retainNode(node)
  } else {
    const title =
      node.attrs.title == null ? "" : JSON.stringify(String(node.attrs.title))

    changeList.enterMarked(node).insertMarker("[", node.marks)
    expandFragment(node.content, changeList)
    return changeList
      .insertMarker("](", node.marks)
      .insertMarkup(`${node.attrs.href} ${title}`, node.marks)
      .insertMarker(")", node.marks)
      .exitNode()
  }
}

export const expandImage = (node: Node, changeList: ChangeList) => {
  // changeList
  //   .insertMarkupCode("![", node.marks)
  //   .insertMarkup(node.attrs.alt, node.marks)
  //   .insertMarkupCode("](", node.marks)
  const { schema } = node.type
  const title =
    node.attrs.title == null ? "" : JSON.stringify(String(node.attrs.title))

  const isSelected = changeList.isSelected(node)
  const direction = changeList.direction()

  const expandedNode = schema.node(
    "expandedImage",
    node.attrs,
    [
      changeList.marker("![", node.marks),
      changeList.markup(node.attrs.alt, node.marks),
      changeList.marker("](", node.marks),
      changeList.markup(`${node.attrs.src} ${title}`, node.marks),
      changeList.marker(")", node.marks)
    ],
    node.marks
  )

  const changes = changeList.deleteNode(node).insertNode(expandedNode)

  const result = !isSelected
    ? changes
    : direction < 0
      ? changes.setCaret(-2)
      : changes.setCaret(-expandedNode.nodeSize + 3)
  return result
}

export const expandText = (node: Node, changeList: ChangeList) => {
  return changeList.retainMarkedText(node)
}

export const expandHeading = (node: Node, changeList: ChangeList) => {
  if (node.attrs.marked != null) {
    return changeList.retainNode(node)
  } else {
    const level: number = node.attrs.level || 1
    changeList.enterMarked(node)
    changeList.insertMarkup(`${"#".repeat(level)} `, node.marks, {
      class: "markup heading"
    })
    expandFragment(node.content, changeList)
    return changeList.exitNode()
  }
}

export const expandParagraph = (node: Node, changeList: ChangeList) => {
  changeList.enterMarked(node)
  expandFragment(node.content, changeList)
  return changeList.exitNode()
}

export const expandHorizontalRule = (node: Node, changeList: ChangeList) => {
  const { schema } = node.type
  const isSelected = changeList.isSelected(node)
  const direction = changeList.direction()
  const expandedNode = schema.node("expandedHorizontalRule", node.attrs, [
    changeList.marker(node.attrs.markup, node.marks)
  ])
  const changes = changeList.deleteNode(node).insertNode(expandedNode)

  const result = !isSelected
    ? changes
    : direction < 0
      ? changes.setCaret(-1)
      : changes.setCaret(-expandedNode.nodeSize + 1)
  return result
}
