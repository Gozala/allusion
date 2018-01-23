// @flow

import { EditorState, Selection, TextSelection } from "prosemirror-state"
import { EditorView } from "prosemirror-view"
import { DOMParser } from "prosemirror-model"
import { keymap } from "prosemirror-keymap"
import { history } from "prosemirror-history"
import { baseKeymap } from "prosemirror-commands"
import { Plugin } from "prosemirror-state"
import { dropCursor } from "prosemirror-dropcursor"
import { gapCursor } from "prosemirror-gapcursor"
import { menuBar, type MenuItem } from "prosemirror-menu"
import {
  schema,
  defaultMarkdownParser,
  defaultMarkdownSerializer
} from "prosemirror-markdown"

import codeBlock from "./CodeBlock"
import { menu, type MenuOptions } from "./Menu"
import keyBindings from "./KeyBindings"
import inputRules from "./InputRules"

interface EditorOptions {
  keyMap?: Object;
  history?: boolean;
  menu?: MenuOptions;
}

export default (
  target: ?Node,
  content: string = "",
  options: EditorOptions = {}
): EditorView =>
  new EditorView(target, {
    state: EditorState.create({
      doc: defaultMarkdownParser.parse(content),
      plugins: [
        inputRules(schema),
        keymap(keyBindings(schema, options.keyMap)),
        keymap(baseKeymap),
        dropCursor(),
        gapCursor(),
        ...(options.menu == null ? [] : [menu(options.menu)]),
        ...(options.history == false ? [] : [history()]),
        codeBlock()
      ]
    })
  })
