// @flow

import { Plugin, PluginKey, Transaction } from "prosemirror-state"
import { Decoration, DecorationSet, EditorView } from "prosemirror-view"
import type { EditorState, Schema, Node, Selection } from "prosemirror-state"
import CodeBlock from "./CodeBlock"
import InlineNode from "./InlineNode"
import keyDownHandler from "./CodeBlock/KeyDownHandler"

export type EditorConfig = {
  schema?: Schema,
  doc?: Node,
  selection?: Selection,
  plugins?: Plugin[]
}

export type JSONModel = {}

export class Model {
  static init(config: EditorConfig, state: EditorState): Model {
    console.log("plugin init", config, state)
    return Model.new()
  }
  static apply(
    tr: Transaction,
    self: Model,
    last: EditorState,
    next: EditorState
  ): Model {
    console.log(`transact!`, {
      isSelectionChanged: tr.selectionSet,
      selection: tr.selection.toJSON(),
      isDocChanged: tr.docChanged,
      tr: tr
    })

    const meta = tr.getMeta(pluginKey)
    return meta ? Model.withRoot(self, meta.root, next) : Model.update(self, tr)
  }
  static toJSON(self: Model): JSONModel {
    return self
  }
  static fromJSON(
    config: EditorConfig,
    json: JSONModel,
    state: EditorState
  ): Model {
    return Model.new()
  }
  static new() {
    return new Model(null, DecorationSet.empty)
  }

  static withRoot(self: Model, root: Document, state: EditorState) {
    return self.root === root ? self : Model.withDecorations(root, state)
  }
  static update(self: Model, tr: Transaction) {
    return new Model(self.root, self.decorations.map(tr.mapping, tr.doc))
  }
  static withDecorations(root: Document, state: EditorState) {
    const node = root.createElement("span")
    node.textContent = "🕺🕺🕺"
    const widget = Decoration.widget(26, node, {
      side: 1
    })
    const decorations = DecorationSet.create(state.doc, [widget])
    return new Model(root, decorations)
  }
  decorations: DecorationSet
  root: ?Document
  constructor(root: ?Document, decorations: DecorationSet) {
    this.decorations = decorations
  }
}
export const pluginKey = new PluginKey("allusion")
export default (): Plugin =>
  new Plugin({
    key: pluginKey,
    state: Model,
    view(editor: EditorView) {
      const tr = editor.state.tr.setMeta(pluginKey, { root: editor.root })
      editor.dispatch(tr)
      return {}
    },
    props: {
      decorations(state: EditorState) {
        return this.getState(state).decorations
      },
      handleKeyDown: keyDownHandler,
      nodeViews: {
        code_block: CodeBlock.new,
        code: InlineNode.new,
        strong: InlineNode.new,
        em: InlineNode.new,
        strike_through: InlineNode.new,
        link: InlineNode.new
      }
    }
  })
