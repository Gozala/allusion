// @flow strict

import Parser from "../src/UI/Allusion/Parser"
import Serializer from "../src/UI/Allusion/Serializer"
import { expandRange } from "../src/UI/ProseMirror/Expand"
import { collapseRange } from "../src/UI/ProseMirror/Collapse"
import ChangeList from "../src/UI/ProseMirror/ChangeList"
import { editableRange, EditRange } from "../src/UI/ProseMirror/EditRange"
import { EditorState, Selection, TextSelection } from "prosemirror-state"
import type { ResolvedPos, Fragment, Node, Mark } from "prosemirror-model"
import test from "blue-tape"
import { assign } from "markdown-it/lib/common/utils"
import {
  isMarkup,
  getMarkupMarksAround,
  findMarkupRange,
  findMarkupRangeStart,
  findMarkupRangeEnd
} from "../src/UI/ProseMirror/Marks"
import { traverse } from "../src/UI/ProseMirror/Traverse"

test("strong link", async test => {
  const source = `**strong _statement_ here**`
  const doc = Parser.parse(source)
  const selection = TextSelection.create(doc, 2)
  const range = editableRange(selection) //?
  const state = EditorState.create({ doc, selection })

  doc.slice(range.index, range.index + range.length) //?JSON.stringify($, null, 2)

  const tr = expandRange(state.tr, range) //?
  tr.doc //?$.toString()

  tr.doc.slice(27).toString() //?
  tr.setSelection(TextSelection.create(tr.doc, 27)) //?
  editableRange(tr.selection).sliceFrom(tr.doc) //?$.toString()
})

test("strong link", async test => {
  const source = `**hello** world`
  const doc = Parser.parse(source)

  {
    const marks = marksAt(doc)
    doc.toString() //?

    test.deepEqual(marks(0), [])
    test.deepEqual(marks(1), ["**"])
    test.deepEqual(marks(2), ["**"])
    test.deepEqual(marks(3), ["**"])
    test.deepEqual(marks(4), ["**"])
    test.deepEqual(marks(5), ["**"])
    test.deepEqual(marks(6), ["**"])
    test.deepEqual(marks(7), [])
    test.deepEqual(marks(8), [])
  }

  const selection = TextSelection.create(doc, 4)
  const range = editableRange(selection)
  const state = EditorState.create({ doc, selection })
  const tr = expandRange(state.tr, range)

  {
    const doc = tr.doc
    const marks = marksAt(doc)
    doc.toString() //?
    marks(0) //?
    marks(1) //?
    marks(2) //?
    marks(3) //?
    marks(4) //?
    marks(5) //?
    marks(6) //?
    marks(7) //?
    marks(8) //?
    marks(9) //?
    marks(10) //?
    doc.slice(10).toString() //?

    const at = doc.resolve(10)
    const { parent, pos, nodeBefore, nodeAfter } = at
    const index = at.index() //?
    const node = parent.childCount > index ? parent.child(index) : null //?
    const isOverMarkup = node ? node.marks.some(isMarkup) : false //?
  }
})

test("marks next to each other", async test => {
  const source = `**hello**_world_`
  const doc = Parser.parse(source)

  markup(doc) //?
  {
    test.deepEqual(markup(doc), {
      "|<paragraph>strong(hello)em(world)</paragraph>": {
        marks: [],
        position: 0,
        range: "<>",
        start: 0,
        end: 0
      },
      "<paragraph>|strong(hello)em(world)</paragraph>": {
        marks: ["**"],
        position: 1,
        range: '<strong("hello")>',
        start: 1,
        end: 6
      },
      "<paragraph>strong(h|ello)em(world)</paragraph>": {
        marks: ["**"],
        position: 2,
        range: '<strong("hello")>',
        start: 1,
        end: 6
      },
      "<paragraph>strong(he|llo)em(world)</paragraph>": {
        marks: ["**"],
        position: 3,
        range: '<strong("hello")>',
        start: 1,
        end: 6
      },
      "<paragraph>strong(hel|lo)em(world)</paragraph>": {
        marks: ["**"],
        position: 4,
        range: '<strong("hello")>',
        start: 1,
        end: 6
      },
      "<paragraph>strong(hell|o)em(world)</paragraph>": {
        marks: ["**"],
        position: 5,
        range: '<strong("hello")>',
        start: 1,
        end: 6
      },
      "<paragraph>strong(hello)|em(world)</paragraph>": {
        marks: ["**", "_"],
        position: 6,
        range: '<strong("hello"), em("world")>',
        start: 1,
        end: 11
      },
      "<paragraph>strong(hello)em(w|orld)</paragraph>": {
        marks: ["_"],
        position: 7,
        range: '<em("world")>',
        start: 6,
        end: 11
      },
      "<paragraph>strong(hello)em(wo|rld)</paragraph>": {
        marks: ["_"],
        position: 8,
        range: '<em("world")>',
        start: 6,
        end: 11
      },
      "<paragraph>strong(hello)em(wor|ld)</paragraph>": {
        marks: ["_"],
        position: 9,
        range: '<em("world")>',
        start: 6,
        end: 11
      },
      "<paragraph>strong(hello)em(worl|d)</paragraph>": {
        marks: ["_"],
        position: 10,
        range: '<em("world")>',
        start: 6,
        end: 11
      },
      "<paragraph>strong(hello)em(world)|</paragraph>": {
        marks: ["_"],
        position: 11,
        range: '<em("world")>',
        start: 6,
        end: 11
      }
    })
  }

  const selection = TextSelection.create(doc, 6) //?
  const range = editableRange(selection)
  const state = EditorState.create({ doc, selection })
  const tr = expandRange(state.tr, range)

  {
    const doc = tr.doc
    doc.toString() //?
    markup(doc) //?
    test.deepEqual(markup(doc), {
      "|<paragraph>edit(markup(**))edit(strong(hello))edit(markup(**_))edit(em(world))edit(markup(_))</paragraph>": {
        marks: [],
        position: 0,
        range: "<>",
        start: 0,
        end: 0
      },
      "<paragraph>|edit(markup(**))edit(strong(hello))edit(markup(**_))edit(em(world))edit(markup(_))</paragraph>": {
        marks: ["**"],
        position: 1,
        range:
          '<edit(markup("**")), edit(strong("hello")), edit(markup("**_"))>',
        start: 1,
        end: 11
      },
      "<paragraph>edit(markup(*|*))edit(strong(hello))edit(markup(**_))edit(em(world))edit(markup(_))</paragraph>": {
        marks: ["**"],
        position: 2,
        range:
          '<edit(markup("**")), edit(strong("hello")), edit(markup("**_"))>',
        start: 1,
        end: 11
      },
      "<paragraph>edit(markup(**))|edit(strong(hello))edit(markup(**_))edit(em(world))edit(markup(_))</paragraph>": {
        marks: ["**"],
        position: 3,
        range:
          '<edit(markup("**")), edit(strong("hello")), edit(markup("**_"))>',
        start: 1,
        end: 11
      },
      "<paragraph>edit(markup(**))edit(strong(h|ello))edit(markup(**_))edit(em(world))edit(markup(_))</paragraph>": {
        marks: ["**"],
        position: 4,
        range:
          '<edit(markup("**")), edit(strong("hello")), edit(markup("**_"))>',
        start: 1,
        end: 11
      },
      "<paragraph>edit(markup(**))edit(strong(he|llo))edit(markup(**_))edit(em(world))edit(markup(_))</paragraph>": {
        marks: ["**"],
        position: 5,
        range:
          '<edit(markup("**")), edit(strong("hello")), edit(markup("**_"))>',
        start: 1,
        end: 11
      },
      "<paragraph>edit(markup(**))edit(strong(hel|lo))edit(markup(**_))edit(em(world))edit(markup(_))</paragraph>": {
        marks: ["**"],
        position: 6,
        range:
          '<edit(markup("**")), edit(strong("hello")), edit(markup("**_"))>',
        start: 1,
        end: 11
      },
      "<paragraph>edit(markup(**))edit(strong(hell|o))edit(markup(**_))edit(em(world))edit(markup(_))</paragraph>": {
        marks: ["**"],
        position: 7,
        range:
          '<edit(markup("**")), edit(strong("hello")), edit(markup("**_"))>',
        start: 1,
        end: 11
      },
      "<paragraph>edit(markup(**))edit(strong(hello))|edit(markup(**_))edit(em(world))edit(markup(_))</paragraph>": {
        marks: ["**", "_"],
        position: 8,
        range:
          '<edit(markup("**")), edit(strong("hello")), edit(markup("**_")), edit(em("world")), edit(markup("_"))>',
        start: 1,
        end: 17
      },
      "<paragraph>edit(markup(**))edit(strong(hello))edit(markup(*|*_))edit(em(world))edit(markup(_))</paragraph>": {
        marks: ["**", "_"],
        position: 9,
        range:
          '<edit(markup("**")), edit(strong("hello")), edit(markup("**_")), edit(em("world")), edit(markup("_"))>',
        start: 1,
        end: 17
      },
      "<paragraph>edit(markup(**))edit(strong(hello))edit(markup(**|_))edit(em(world))edit(markup(_))</paragraph>": {
        marks: ["**", "_"],
        position: 10,
        range:
          '<edit(markup("**")), edit(strong("hello")), edit(markup("**_")), edit(em("world")), edit(markup("_"))>',
        start: 1,
        end: 17
      },
      "<paragraph>edit(markup(**))edit(strong(hello))edit(markup(**_))|edit(em(world))edit(markup(_))</paragraph>": {
        marks: ["**", "_"],
        position: 11,
        range:
          '<edit(markup("**")), edit(strong("hello")), edit(markup("**_")), edit(em("world")), edit(markup("_"))>',
        start: 1,
        end: 17
      },
      "<paragraph>edit(markup(**))edit(strong(hello))edit(markup(**_))edit(em(w|orld))edit(markup(_))</paragraph>": {
        marks: ["_"],
        position: 12,
        range: '<edit(markup("**_")), edit(em("world")), edit(markup("_"))>',
        start: 8,
        end: 17
      },
      "<paragraph>edit(markup(**))edit(strong(hello))edit(markup(**_))edit(em(wo|rld))edit(markup(_))</paragraph>": {
        marks: ["_"],
        position: 13,
        range: '<edit(markup("**_")), edit(em("world")), edit(markup("_"))>',
        start: 8,
        end: 17
      },
      "<paragraph>edit(markup(**))edit(strong(hello))edit(markup(**_))edit(em(wor|ld))edit(markup(_))</paragraph>": {
        marks: ["_"],
        position: 14,
        range: '<edit(markup("**_")), edit(em("world")), edit(markup("_"))>',
        start: 8,
        end: 17
      },
      "<paragraph>edit(markup(**))edit(strong(hello))edit(markup(**_))edit(em(worl|d))edit(markup(_))</paragraph>": {
        marks: ["_"],
        position: 15,
        range: '<edit(markup("**_")), edit(em("world")), edit(markup("_"))>',
        start: 8,
        end: 17
      },
      "<paragraph>edit(markup(**))edit(strong(hello))edit(markup(**_))edit(em(world))|edit(markup(_))</paragraph>": {
        marks: ["_"],
        position: 16,
        range: '<edit(markup("**_")), edit(em("world")), edit(markup("_"))>',
        start: 8,
        end: 17
      },
      "<paragraph>edit(markup(**))edit(strong(hello))edit(markup(**_))edit(em(world))edit(markup(_))|</paragraph>": {
        marks: ["_"],
        position: 17,
        range: '<edit(markup("**_")), edit(em("world")), edit(markup("_"))>',
        start: 8,
        end: 17
      }
    })
  }
})

const marksAt = node => offset => getMarkupMarksAround(node.resolve(offset))

const markup = node => {
  const size = node.content.size
  const out = {}
  let offset = 0
  while (offset < size) {
    const position = node.resolve(offset)
    const marks = getMarkupMarksAround(position)
    const [start, end] = findMarkupRange(position)
    out[toDebugString(position)] = {
      marks,
      position: offset,
      range: node.slice(start, end).content.toString(),
      start,
      end
    }
    offset++
  }
  return out
}

const toDebugString = (anchor: ResolvedPos): string =>
  traverse(
    {
      text(node, buffer) {
        const offset = buffer.index - buffer.offset
        const { textContent: text, nodeSize } = node
        const content =
          offset > 0 && offset < nodeSize
            ? `${text.slice(0, offset)}|${text.slice(offset)}`
            : text
        const markup = enmark(content, node.marks)
        buffer.text += offset === 0 ? `|${markup}` : markup
        buffer.offset += nodeSize
        return buffer
      },
      node(node, buffer) {
        buffer.text += node.toString()
        buffer.offset += node.nodeSize
        return buffer
      },
      enter(node, buffer) {
        const content = `<${node.type.name}>`
        buffer.text += buffer.index === buffer.offset ? `|${content}` : content
        buffer.offset += 1
        return buffer
      },
      exit(node, buffer) {
        const content = `</${node.type.name}>`
        buffer.text += buffer.index === buffer.offset ? `|${content}` : content
        buffer.offset += 1
        return buffer
      }
    },
    {
      text: "",
      offset: 0,
      index: anchor.pos
    },
    anchor.doc
  ).text

const enmark = (content: string, marks: Mark[]) => {
  let result = content
  for (let i = marks.length - 1; i >= 0; i--) {
    result = `${marks[i].type.name}(${result})`
  }
  return result
}
