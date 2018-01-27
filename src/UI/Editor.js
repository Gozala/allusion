// @flow

import { EditorState, Selection, TextSelection } from "prosemirror-state"
import { EditorView } from "prosemirror-view"
import { keymap } from "prosemirror-keymap"
import { history } from "prosemirror-history"
import { baseKeymap } from "prosemirror-commands"
import { Plugin } from "prosemirror-state"
import { dropCursor } from "prosemirror-dropcursor"
import { gapCursor } from "prosemirror-gapcursor"
import { menuBar, type MenuItem } from "prosemirror-menu"
import schema from "./Markdown/Schema"
import markdownParser from "./Markdown/Parser"

import { menu, type MenuOptions } from "./Editor/Menu"
import Allusion from "./Allusion"
import keyBindings from "./Editor/KeyBindings"
import inputRules from "./Editor/InputRules"

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
    mount: target,
    state: EditorState.create({
      doc: markdownParser.parse(content),
      plugins: [
        Allusion(),
        inputRules(schema),
        keymap(keyBindings(schema, options.keyMap)),
        keymap(baseKeymap),
        dropCursor(),
        gapCursor(),
        ...(options.menu == null ? [] : [menu(options.menu)]),
        ...(options.history == false ? [] : [history()])
      ]
    })
  })
