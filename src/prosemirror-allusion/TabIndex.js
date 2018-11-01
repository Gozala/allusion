// @flow strict

import { Plugin, TextSelection } from "../prosemirror-state/src/index.js"
import { EditorView } from "../prosemirror-view/src/index.js"
import { keydownHandler } from "../prosemirror-keymap/src/keymap.js"

/*:: 
import type { EditorState, Selection } from "../prosemirror-state/src/index.js"
import type { Node, ResolvedPos } from "../prosemirror-model/src/index.js"

export type Direction = -1 | 1
*/

 class TabIndex {
  /*::
  editor: EditorView & {
    eventHandlers: { [string]: (Event) => void }
  }
  types: string[]
  handleEvent: EventHandler
  destroy: () => void
  */
  constructor(editor/* : EditorView */, types/* : string[] */) {
    const anyEditor/*:any*/ = editor
    this.editor = anyEditor
    this.types = types
  }
  handleEvent(event/* : Event */)/* : mixed */ {
    const { editor } = this
    const captureType = `${event.type}Capture`
    const handler = editor.eventHandlers[event.type]
    if (handler) {
      handler(event)
    }
  }
  destroy() {
    for (const type of this.types) {
      this.editor.dom.removeEventListener(type, this, true)
    }
  }
  init() {
    for (const type of this.types) {
      this.editor.dom.addEventListener(type, this, true)
    }
  }
  static new(editor/* : EditorView */, types/* : string[] */) {
    const self = new TabIndex(editor, types)
    self.init()
    return self
  }
}

export const plugin = (types/* : string[] */ = ["focus"]) =>
  new Plugin({
    // view(editor: EditorView) {
    //   return TabIndex.new(editor, types)
    // },
    props: {
      handleKeyDown
      // handleDOMEvents: {
      //   focus(view: EditorView, event: Event): boolean {
      //     const { pmViewDesc } = (event.target: any)
      //     const { node } = pmViewDesc
      //     if (node != null && node.attrs.tabindex != null) {
      //       const { state } = view
      //       const { posAtStart, posAtEnd, posBefore } = pmViewDesc
      //       const selection = TextSelection.create(
      //         state.doc,
      //         posBefore,
      //         posBefore + node.content.size
      //       )
      //       event.preventDefault()
      //       event.stopPropagation()
      //       view.focus()
      //       view.dispatch(state.tr.setSelection(selection))
      //     }
      //     return true
      //   }
      // }
    }
  })


const findDepth = (pos/* : ResolvedPos */)/* : ?number */ => {
  let depth = pos.depth
  while (depth > 0) {
    const node = pos.node(depth)
    if (node.attrs.placeholder != null) {
      return depth
    } else {
      depth--
    }
  }
  return null
}

const switchSelection = (direction/* : Direction */) => (
  state/* : EditorState */,
  dispatch,
  view
) => {
  const { $from, $to } = state.selection
  const { doc } = state
  const depth = $from.sameParent($to) ? findDepth($to) : null
  if (depth != null) {
    const selection =
      direction > 0
        ? nextSelection(doc, $to.end(depth) + 1, doc.content.size) ||
          nextSelection(doc, 0, $from.start(depth) - 1)
        : previousSelection(doc, 0, $from.start(depth) - 1) ||
          previousSelection(doc, $to.end(depth) + 1, doc.content.size)

    if (selection && dispatch) {
      dispatch(state.tr.setSelection(selection))
      return true
    }
  }

  return false
}

const nextSelection = (root/* : Node */, from/* : number */, to/* : number */)/* : ?Selection */ =>
  nodeContentSelection(root, indexOfNext(root, from, to))

const previousSelection = (root/* : Node */, from/* : number */, to/* : number */)/* : ?Selection */ =>
  nodeContentSelection(root, indexOfPrevious(root, from, to))

const nodeContentSelection = (root/* : Node */, n/* : number */)/* : ?Selection */ => {
  const node = n >= 0 && n <= root.content.size ? root.nodeAt(n) : null
  if (node != null) {
    const index = n + 1
    return TextSelection.create(root, index, index + node.content.size)
  } else {
    return null
  }
}

const indexOfNext = (node/* : Node */, from/* : number */, to/* : number */)/* : number */ => {
  let index = -1
  node.nodesBetween(from, to, (node, pos, parent) => {
    if (index == -1 && node.attrs.tabindex === 0) {
      index = pos
    }

    return index == -1
  })
  return index
}

const indexOfPrevious = (node/* : Node */, from/* : number */, to/* : number */)/* : number */ => {
  let index = -1
  node.nodesBetween(from, to, (node, pos, parent) => {
    if (node.attrs.tabindex === 0) {
      index = pos
    }

    return true
  })
  return index
}

export const handleKeyDown = keydownHandler({
  Tab: switchSelection(1),
  "Shift-Tab": switchSelection(-1)
})
