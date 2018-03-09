// @flow strict

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
import HeadingView from "./Allusion/NodeView/Heading"
import { Link, Address, URL, Title } from "./Allusion/NodeView/Link"
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
        return this.getState(state).decorations()
      },
      handleKeyDown: keyDownHandler,
      handleTextInput(
        view: EditorView,
        from: number,
        to: number,
        text: string
      ): boolean {
        // if (/[\*~#_\[\]\(\)`]/.test(text)) {
        //   const { schema, tr, selection } = view.state
        //   const { from, to } = selection
        //   const mark = schema.mark("markup")
        //   view.dispatch(
        //     tr
        //       .addStoredMark(mark)
        //       .insertText(text)
        //       .removeStoredMark(mark)
        //       .setMeta(pluginKey, { type: "syntaxInput", text })
        //   )
        //   return true
        // }
        return false
      },
      nodeViews: {
        code_block: CodeBlock.new,
        // heading: HeadingView.new,
        code: InlineNode.new,
        [Link.blotName]: Link.view(),
        [Address.blotName]: Address.view(),
        [URL.blotName]: URL.view(),
        [Title.blotName]: Title.view()
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
  decorations() {
    return this.program.decorations(this.state)
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
    before: EditorState,
    after: EditorState
  ): Allusion<message, model> {
    const { program, inbox } = self
    let { state } = self
    const meta = tr.getMeta(pluginKey) || { type: "noop" }
    const messages = program.transact(state, {
      transaction: tr,
      before,
      after,
      meta
    })

    if (messages != null) {
      const queued = inbox.splice(0)
      for (let payload of [...messages, ...queued]) {
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
      editor.dispatch(editor.state.tr)
    }
  }
  static async send(self: Allusion<message, model>) {
    const { state, program, editor } = self
    if (editor != null) {
      const transactions = await program.send(state)
      for (const transaction of transactions) {
        editor.dispatch(transaction)
      }
    }
  }
}
