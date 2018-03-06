// @flow strict

import editor from "./Editor"
import "prosemirror-view/style/prosemirror.css"
import "../../css/editor.css"
import "../../css/code.css"

self.editor = editor(
  document.body,
  `/ Welcome to Allusion

This an experimental text editor for note taking and thought organization.
It would ❤️ to do many things & has some ideas how, but for now it does very
little.

### Text editing

Allusion is learning to speak [Markdown](http://commonmark.org/help/).

- It creates Heading if you type \`# \`, \`## \`, \`### \`
- It creates Unordered List if you type \`- \` & Ordered List if you type  \`1. \`
- It creates Blockquote if you type \`> \`
- It creates **Bold text** if you type \`**text\`
- It creates *Italic text* if you type \`*text\`
- It creates ~~Strikethrough~~ text if you type \`~~text\`
- It creates \`Inline code\` if you type "\`text"
- It creates Horizontal Rule line if you type \`---\`
---
### Code editing

Markdown code blocks are rendered with code editor, which provides syntaxt
highlighting, auto-indentation, and more.

\`\`\`
function max(a, b) {
  return a > b ? a : b
}
\`\`\`

The content of the code editor is kept in sync with the content of the code block in the rich text editor, so that it
is as if you're directly editing the outer document, using a more convenient interface.`
)
self.editor.focus()
