// @flow strict

import { Plugin, TextSelection } from "prosemirror-state"
import type { Node, ResolvedPos } from "prosemirror-model"
import type { EditorView } from "prosemirror-view"
import type { EditorState, Selection, Transaction } from "prosemirror-state"
import { EditBlock, EditNode } from "./Schema"
import { nodePosition } from "./Position"
import { findEditRange } from "./Marks"
import { updateMarkup } from "./EditRange"
import {
  Decoration,
  DecorationSet,
  type InlineDecorationSpec
} from "prosemirror-view"
import { debounce } from "./Util"
import type Serializer from "./Serializer"
import type Parser from "./Parser"

export const isEditBlock = (node: Node): boolean =>
  node.type.spec instanceof EditBlock

export const isEditNode = (node: Node): boolean =>
  node.type.spec instanceof EditNode

export const nodeDecoration = (attrs: Object) => (offset: number, node: Node) =>
  Decoration.node(offset, offset + node.nodeSize, attrs)

export const inlineDecoration = (
  attrs: Object,
  spec?: InlineDecorationSpec
) => (from: number, to: number) => Decoration.inline(from, to, attrs, spec)

export const inlineBlockDecoration = (
  attrs: Object,
  spec?: InlineDecorationSpec
) => (offset: number, node: Node) =>
  Decoration.inline(offset, offset + node.nodeSize, attrs, spec)

export const blockDecoration = nodeDecoration({ "data-edit-block": "" })

export const editBlockDecoration = inlineBlockDecoration(
  {
    "data-edit-block-range": ""
  },
  {
    inclusiveStart: false,
    inclusiveEnd: false
  }
)

export const editRangeDecoration = inlineDecoration(
  { "data-edit-range": "" },
  {
    inclusiveStart: false,
    inclusiveEnd: false
  }
)

export const decorations = ({
  doc,
  selection
}: {
  doc: Node,
  selection: Selection
}): DecorationSet => {
  const { $anchor, $head, node } = selection
  const block = editBlock(selection)
  if (block == null) {
    return DecorationSet.empty
  } else {
    const [start, end] = findEditRange($anchor, isEditNode)

    return DecorationSet.create(doc, [
      blockDecoration(block.index, block.node),
      editBlockDecoration(block.index, block.node),
      editRangeDecoration(start, end)
    ])
  }
}

export const editBlock = ({ $anchor, node }: Selection) =>
  node && isEditBlock(node)
    ? { index: $anchor.pos, node }
    : nodePosition(isEditBlock, $anchor)

class Model {
  block: ?{ index: number, node: Node }
  editRange: [number, number]
  decorations: DecorationSet
  selectTime: number
  editTime: number
  time: number
  constructor(
    editBlock: ?{ index: number, node: Node },
    editRange: [number, number],
    decorations: DecorationSet,
    selectTime: number,
    editTime: number,
    time: number
  ) {
    this.block = editBlock
    this.editRange = editRange
    this.decorations = decorations
    this.selectTime = selectTime
    this.editTime = editTime
    this.time = time
  }

  static new(
    tr: Transaction,
    selectTime: number = tr.time,
    editTime: number = tr.time,
    updateTime: number = tr.time
  ) {
    const block = editBlock(tr.selection)
    if (block == null) {
      return new Model(
        null,
        [0, 0],
        DecorationSet.empty,
        selectTime,
        editTime,
        updateTime
      )
    } else {
      const { selection, doc } = tr
      const { index, node } = block
      const editRange = findEditRange(selection.$anchor, isEditNode)
      const [start, end] = editRange
      const decorations = DecorationSet.create(doc, [
        blockDecoration(index, node),
        editBlockDecoration(index, node),
        editRangeDecoration(start, end)
      ])
      return new this(
        block,
        editRange,
        decorations,
        selectTime,
        editTime,
        updateTime
      )
    }
  }
  withinBlock(selection: Selection) {
    const { block } = this
    if (!block) {
      return false
    } else {
      const start = block.index
      const end = start + block.node.nodeSize
      const { from, to } = selection
      return from >= start && from <= end && to >= start && to <= end
    }
  }
  withinRange(selection: Selection) {
    const [start, end] = this.editRange
    const { from, to } = selection
    return from >= start && from <= end && to >= start && to <= end
  }
  select(tr: Transaction) {
    return Model.new(tr, this.selectTime, this.editTime, tr.time)
  }
  edit(tr: Transaction) {
    return Model.new(tr, this.selectTime, this.editTime, tr.time)
  }
  transact(tr: Transaction) {
    try {
      return new Model(
        this.block,
        this.editRange,
        this.decorations.map(tr.mapping, tr.doc),
        tr.docChanged ? this.selectTime : tr.time,
        tr.docChanged ? tr.time : this.editTime,
        tr.time
      )
    } catch (error) {
      // This is not ideal solution but unfortunately prose-mirrror throws when
      // this.decorations.map is called on a bloquote node decoration that is
      // deleted. TODO: Submit a bug for prose-mirror.
      return Model.new(
        tr,
        tr.docChanged ? this.selectTime : tr.time,
        tr.docChanged ? tr.time : this.editTime,
        tr.time
      )
    }
  }
}

export const plugin = (parser: Parser, serializer: Serializer) => {
  let timer = null
  let id = 0

  const dispatch = message => (editorView: EditorView) => {
    editorView.dispatch(editorView.state.tr.setMeta(plugin, message))
  }

  const requestEdit = debounce(dispatch("edit"), 80)
  const requestSelect = debounce(dispatch("select"), 90)

  const plugin = new Plugin({
    state: {
      init(config, state): Model {
        return Model.new(state.tr)
      },
      apply(tr, state, oldState, newState): Model {
        switch (tr.getMeta(plugin)) {
          case "edit":
            return state.edit(tr)
          case "select":
            return state.select(tr)
          default:
            return state.transact(tr)
        }
      }
    },
    appendTransaction(
      changes: Transaction[],
      oldState: EditorState,
      newState: EditorState
    ): ?Transaction {
      const tr = changes[changes.length - 1]
      const state = plugin.getState(newState)
      switch (tr.getMeta(plugin)) {
        case "edit":
          return updateMarkup(tr, parser, serializer)
        default:
          return null
      }
    },
    view(editorView) {
      return {
        update(editorView: EditorView, oldState: EditorState) {
          const newState = editorView.state
          const state = plugin.getState(newState)
          if (state.time === state.editTime) {
            requestEdit(editorView)
          }

          if (state.time === state.selectTime) {
            requestSelect(editorView)
          }
        }
      }
    },
    props: {
      decorations(state) {
        return this.getState(state).decorations
      }
    }
  })
  return plugin
}
