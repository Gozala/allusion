// @flow strict

import {
  wrapIn,
  setBlockType,
  chainCommands,
  toggleMark,
  exitCode,
  joinUp,
  joinDown,
  lift,
  selectParentNode
} from "../prosemirror-commands/src/commands.js"
import {
  wrapInList,
  splitListItem,
  liftListItem,
  sinkListItem
} from "../prosemirror-schema-list/src/schema-list.js"
import { undo, redo } from "../prosemirror-history/src/history.js"
import { undoInputRule } from "../prosemirror-inputrules/src/index.js"
import { schema } from "../prosemirror-schema-basic/src/schema-basic.js"
import { keymap } from "../prosemirror-keymap/src/keymap.js"
import Header from "./Header.js"

const mac =
  typeof navigator != "undefined" ? /Mac/.test(navigator.platform) : false

// :: (Schema, ?Object) → Object
// Inspect the given schema looking for marks and nodes from the
// basic schema, and if found, add key bindings related to them.
// This will add:
//
// * **Mod-b** for toggling [strong](#schema-basic.StrongMark)
// * **Mod-i** for toggling [emphasis](#schema-basic.EmMark)
// * **Mod-`** for toggling [code font](#schema-basic.CodeMark)
// * **Ctrl-Shift-0** for making the current textblock a paragraph
// * **Ctrl-Shift-1** to **Ctrl-Shift-Digit6** for making the current
//   textblock a heading of the corresponding level
// * **Ctrl-Shift-Backslash** to make the current textblock a code block
// * **Ctrl-Shift-8** to wrap the selection in an ordered list
// * **Ctrl-Shift-9** to wrap the selection in a bullet list
// * **Ctrl->** to wrap the selection in a block quote
// * **Enter** to split a non-empty textblock in a list item while at
//   the same time splitting the list item
// * **Mod-Enter** to insert a hard break
// * **Mod-_** to insert a horizontal rule
// * **Backspace** to undo an input rule
// * **Alt-ArrowUp** to `joinUp`
// * **Alt-ArrowDown** to `joinDown`
// * **Mod-BracketLeft** to `lift`
// * **Escape** to `selectParentNode`
//
// You can suppress or map these bindings by passing a `mapKeys`
// argument, which maps key names (say `"Mod-B"` to either `false`, to
// remove the binding, or a new key name string.
export default (
  schema/* : typeof schema */,
  mapKeys/* : { [string]: false | string } */ = {}
) => {
  let keys = {},
    type
  function bind(input/* : string */, cmd) {
    let key = input
    if (mapKeys) {
      let mapped = mapKeys[key]
      if (mapped === false) return
      if (mapped) key = mapped
    }
    keys[key] = keys[key] ? chainCommands(keys[key], cmd) : cmd
  }

  bind("Mod-z", undo)
  bind("Shift-Mod-z", redo)
  bind("Backspace", undoInputRule)
  if (!mac) bind("Mod-y", redo)

  bind("Alt-ArrowUp", joinUp)
  bind("Alt-ArrowDown", joinDown)
  bind("Mod-BracketLeft", lift)
  bind("Escape", selectParentNode)

  if ((type = schema.marks.strong)) bind("Mod-b", toggleMark(type))
  if ((type = schema.marks.em)) bind("Mod-i", toggleMark(type))
  if ((type = schema.marks.code)) bind("Ctrl-`", toggleMark(type))
  if ((type = schema.marks.strike_through))
    bind("Alt-Shift-`", toggleMark(type))

  if ((type = schema.nodes.bullet_list)) bind("Shift-Ctrl-8", wrapInList(type))
  if ((type = schema.nodes.ordered_list)) bind("Shift-Ctrl-9", wrapInList(type))
  if ((type = schema.nodes.blockquote)) bind("Ctrl->", wrapIn(type))
  if ((type = schema.nodes.hard_break)) {
    let br = type,
      cmd = chainCommands(exitCode, (state, dispatch) => {
        dispatch(state.tr.replaceSelectionWith(br.create()).scrollIntoView())
        return true
      })
    bind("Mod-Enter", cmd)
    bind("Shift-Enter", cmd)
    if (mac) bind("Ctrl-Enter", cmd)
  }
  if ((type = schema.nodes.list_item)) {
    bind("Enter", splitListItem(type))
    bind("Mod-[", liftListItem(type))
    bind("Shift-Tab", liftListItem(type))
    bind("Mod-]", sinkListItem(type))
    bind("Tab", sinkListItem(type))
  }
  if ((type = schema.nodes.paragraph)) bind("Shift-Ctrl-0", setBlockType(type))
  if ((type = schema.nodes.code_block))
    bind("Shift-Ctrl-\\", setBlockType(type))
  if ((type = schema.nodes.heading))
    for (let i = 1; i <= 6; i++)
      bind("Shift-Ctrl-" + i, setBlockType(type, { level: i }))
  if ((type = schema.nodes.horizontal_rule)) {
    let hr = type
    bind("Mod-_", (state, dispatch) => {
      dispatch(state.tr.replaceSelectionWith(hr.create()).scrollIntoView())
      return true
    })
  }

  if ((type = schema.nodes.header)) {
    bind("Enter", Header.onEnter)
  }

  return keymap(keys)
}
