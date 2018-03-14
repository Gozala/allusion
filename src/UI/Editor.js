// @flow strict

import { EditorState, Selection, TextSelection } from "prosemirror-state"
import { EditorView } from "prosemirror-view"
import { keymap } from "prosemirror-keymap"
import { history } from "prosemirror-history"
import { baseKeymap } from "prosemirror-commands"
import { Plugin } from "prosemirror-state"
import { dropCursor } from "prosemirror-dropcursor"
import { gapCursor } from "prosemirror-gapcursor"
import { menuBar, type MenuItem } from "prosemirror-menu"
import schema from "./Allusion/Schema"
import Parser from "./Allusion/Parser"

import { menu, type MenuOptions } from "./Editor/Menu"
import Allusion from "./Allusion"
import keyBindings from "./Allusion/KeyBindings"
import inputRules from "./Editor/InputRules"

interface EditorOptions {
  keyMap?: Object;
  history?: boolean;
  menu?: MenuOptions;
}

export default (
  target: ?Element,
  content: string = "",
  options: EditorOptions = {}
): EditorView =>
  new EditorView({
    mount: target,
    state: EditorState.create({
      doc: schema.node("doc", null, [schema.node("header")]),
      // doc: Parser.parse(content),
      // doc: schema.node("root", null, [
      //   schema.node("article", null, [schema.node("header")])
      // ]),
      // doc: schema.node('doc', null, [schema.node('paragraph')]),
      plugins: [
        Allusion(),
        // inputRules(schema),
        keyBindings(schema, options.keyMap),
        keymap(baseKeymap),
        dropCursor(),
        gapCursor(),
        ...(options.menu == null ? [] : [menu(options.menu)]),
        ...(options.history == false ? [] : [history()])
      ]
    })
  })
