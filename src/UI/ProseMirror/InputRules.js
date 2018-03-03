// @noflow

import { Plugin } from "prosemirror-state"

// ::- Input rules are regular expressions describing a piece of text
// that, when typed, causes something to happen. This might be
// changing two dashes into an emdash, wrapping a paragraph starting
// with `"> "` into a blockquote, or something entirely different.
export class InputRule {
  // :: (RegExp, union<string, (state: EditorState, match: [string], start: number, end: number) → ?Transaction>)
  // Create an input rule. The rule applies when the user typed
  // something and the text directly in front of the cursor matches
  // `match`, which should probably end with `$`.
  //
  // The `handler` can be a string, in which case the matched text, or
  // the first matched group in the regexp, is replaced by that
  // string.
  //
  // Or a it can be a function, which will be called with the match
  // array produced by
  // [`RegExp.exec`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/exec),
  // as well as the start and end of the matched range, and which can
  // return a [transaction](#state.Transaction) that describes the
  // rule's effect, or null to indicate the input was not handled.
  constructor(match, handler, preventDefault = true) {
    this.match = match
    this.handler = typeof handler == "string" ? stringHandler(handler) : handler
    this.preventDefault = preventDefault
  }
}

function stringHandler(string) {
  return function(state, match, start, end) {
    let insert = string
    if (match[1]) {
      let offset = match[0].lastIndexOf(match[1])
      insert += match[0].slice(offset + match[1].length)
      start += offset
      let cutOff = start - end
      if (cutOff > 0) {
        insert = match[0].slice(offset - cutOff, offset) + insert
        start = end
      }
    }
    let marks = state.doc.resolve(start).marks()
    return state.tr.replaceWith(start, end, state.schema.text(insert, marks))
  }
}

const MAX_MATCH = 500

// :: (config: {rules: [InputRule]}) → Plugin
// Create an input rules plugin. When enabled, it will cause text
// input that matches any of the given rules to trigger the rule's
// action.
export function inputRules({ rules }) {
  return new Plugin({
    state: {
      init() {
        return null
      },
      apply(tr, prev) {
        let stored = tr.getMeta(this)
        if (stored) return stored
        return tr.selectionSet || tr.docChanged ? null : prev
      }
    },

    props: {
      handleTextInput(view, from, to, text) {
        let state = view.state,
          $from = state.doc.resolve(from)

        if ($from.parent.type.spec.code) return false

        let textBefore =
          $from.parent.textBetween(
            Math.max(0, $from.parentOffset - MAX_MATCH),
            $from.parentOffset,
            null,
            "\ufffc"
          ) + text

        for (let i = 0; i < rules.length; i++) {
          const rule = rules[i]
          let match = rule.match.exec(textBefore)
          let tr =
            match &&
            rule.handler(
              state,
              match,
              from - (match[0].length - text.length),
              to
            )
          if (!tr) continue
          view.dispatch(tr.setMeta(this, { transform: tr, from, to, text }))
          return rule.preventDefault === true
        }
        return false
      }
    },

    isInputRules: true
  })
}

// :: (EditorState, ?(Transaction)) → bool
// This is a command that will undo an input rule, if applying such a
// rule was the last thing that the user did.
export function undoInputRule(state, dispatch) {
  let plugins = state.plugins
  for (let i = 0; i < plugins.length; i++) {
    let plugin = plugins[i],
      undoable
    if (plugin.spec.isInputRules && (undoable = plugin.getState(state))) {
      if (dispatch) {
        let tr = state.tr,
          toUndo = undoable.transform
        for (let j = toUndo.steps.length - 1; j >= 0; j--)
          tr.step(toUndo.steps[j].invert(toUndo.docs[j]))
        let marks = tr.doc.resolve(undoable.from).marks()
        dispatch(
          tr.replaceWith(
            undoable.from,
            undoable.to,
            state.schema.text(undoable.text, marks)
          )
        )
      }
      return true
    }
  }
  return false
}
