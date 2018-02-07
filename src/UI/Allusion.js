// @flow

import { Plugin, PluginKey } from "prosemirror-state"
import { Decoration, DecorationSet, EditorView } from "prosemirror-view"
import type {
  EditorState,
  Schema,
  Node,
  Selection,
  Transaction
} from "prosemirror-state"
import CodeBlock from "./CodeBlock"
import InlineNode from "./InlineNode"
import keyDownHandler from "./CodeBlock/KeyDownHandler"
import Archive from "./DatArchive"
import type { DatArchive } from "./DatArchive"
import type { Program } from "./Allusion/Program"
import * as program from "./Allusion/Program"
import pluginKey from "./Allusion/Key"

export type EditorConfig = {
  schema?: Schema,
  doc?: Node,
  selection?: Selection,
  plugins?: Plugin[]
}

export default (): Plugin =>
  new Plugin({
    key: pluginKey,
    state: Allusion,
    view(editor: EditorView) {
      const allusion = this.key.getState(editor.state)
      allusion.editor = editor

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

interface ProsemirrorProgram<message, model>
  extends Program<message, model, Transaction, EditorState> {
  transact(model, Transaction, EditorState, EditorState): message[];
}

class Allusion<message, model> {
  program: ProsemirrorProgram<message, model>
  state: model
  inbox: message[]
  editor: ?EditorView
  constructor(
    program: ProsemirrorProgram<message, model>,
    state: model,
    inbox: message[],
    editor: ?EditorView
  ) {
    this.program = program
    this.state = state
    this.inbox = inbox
    this.editor = editor
  }
  static init(
    config: EditorConfig,
    editor: EditorState
  ): Allusion<program.Message, program.Model> {
    const state = program.init(editor)
    const self = new Allusion(program, state, [], null)
    return Allusion.transct(self, state)
  }
  static apply(
    tr: Transaction,
    self: Allusion<message, model>,
    last: EditorState,
    next: EditorState
  ): Allusion<message, model> {
    const { program } = self
    let { state } = self
    const messages = program.transact(state, tr, last, next)
    const meta = tr.getMeta(pluginKey) || []

    if (messages != null) {
      for (let payload of [...messages, ...meta]) {
        state = program.update(state, payload)
      }
    }

    return Allusion.transct(self, state)
  }

  static transct(
    self: Allusion<message, model>,
    state: model
  ): Allusion<message, model> {
    self.state = state
    Allusion.receive(self)
    Allusion.send(self)
    return self
  }

  static async receive(self: Allusion<message, model>) {
    const { state, inbox, program } = self
    const messages = await program.receive(state)
    if (messages.length > 0) {
      inbox.push(...messages)
    }

    // Note on first receive self does not has editor set yet, accessing
    // property here allows it to be set in the meantime.
    const { editor } = self
    if (editor != null && inbox.length > 0) {
      const messages = inbox.splice(0)
      editor.dispatch(editor.state.tr.setMeta(pluginKey, messages))
    }
  }
  static async send(self: Allusion<message, model>) {
    const { state, program, editor } = self
    const transactions = await program.send(state)
    if (editor != null) {
      for (const transaction of transactions) {
        editor.dispatch(transaction)
      }
    }
  }
}
