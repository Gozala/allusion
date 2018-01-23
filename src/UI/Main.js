// @flow

import editor from "./EditorView"
import "prosemirror-view/style/prosemirror.css"
import "../../css/editor.css"
import "../../css/code.css"

self.view = editor(
  document.body,
  `## The code block is a code editor

This editor has been wired up to render code blocks as instances of the
  [CodeMirror](http://codemirror.net) code editor, which provides syntax highlighting, auto-indentation, and similar.

\`\`\`
function max(a, b) {
  return a > b ? a : b
}
\`\`\`

The content of the code editor is kept in sync with the content of the code block in the rich text editor, so that it
is as if you're directly editing the outer document, using a more convenient interface.`
)
self.view.focus()
