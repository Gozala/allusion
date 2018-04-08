// @flow strict

import { Mark } from "prosemirror-model"
import type { Schema, NodeType, Node, Fragment } from "prosemirror-model"

type NodeSerializer = (
  MarkdownSerializerState,
  Node,
  Node | Fragment,
  number
) => void

type MarkSerializer = {
  open: string | ((MarkdownSerializerState, Mark) => string),
  close: string | ((MarkdownSerializerState, Mark) => string),
  mixable?: boolean,
  ignore?: boolean,
  expelEnclosingWhitespace?: boolean
}

type NodeSerializers = { [string]: NodeSerializer }
type MarkSerializers = { [string]: MarkSerializer }

type SerializerOptions = {
  tightLists?: boolean
}

// // ::- A specification for serializing a ProseMirror document as
// // Markdown/CommonMark text.
export default class MarkdownSerializer {
  //   // :: (Object<(state: MarkdownSerializerState, node: Node, parent: Node, index: number)>, Object)
  //   // Construct a serializer with the given configuration. The `nodes`
  //   // object should map node names in a given schema to function that
  //   // take a serializer state and such a node, and serialize the node.
  //   //
  //   // The `marks` object should hold objects with `open` and `close`
  //   // properties, which hold the strings that should appear before and
  //   // after a piece of text marked that way, either directly or as a
  //   // function that takes a serializer state and a mark, and returns a
  //   // string.
  //   //
  //   // Mark information objects can also have a `mixable` property
  //   // which, when `true`, indicates that the order in which the mark's
  //   // opening and closing syntax appears relative to other mixable
  //   // marks can be varied. (For example, you can say `**a *b***` and
  //   // `*a **b***`, but not `` `a *b*` ``.)
  //   //
  //   // The `expelEnclosingWhitespace` mark property causes the
  //   // serializer to move enclosing whitespace from inside the marks to
  //   // outside the marks. This is necessary for emphasis marks as
  //   // CommonMark does not permit enclosing whitespace inside emphasis
  //   // marks, see: http://spec.commonmark.org/0.26/#example-330
  nodes: NodeSerializers
  marks: MarkSerializers
  constructor(nodes: NodeSerializers, marks: MarkSerializers) {
    // :: Object<(MarkdownSerializerState, Node)> The node serializer
    // functions for this serializer.
    this.nodes = nodes
    // :: Object The mark serializer info.
    this.marks = marks
  }
  // :: (Node, ?Object) → string
  // Serialize the content of the given node to
  // [CommonMark](http://commonmark.org/).
  serialize(content: Node | Fragment, options?: SerializerOptions) {
    let state = new MarkdownSerializerState(this.nodes, this.marks, options)
    state.renderContent(content)
    return state.out
  }
  serializeInline(content: Node | Fragment, options?: SerializerOptions) {
    let state = new MarkdownSerializerState(this.nodes, this.marks, options)
    state.renderContentInline(content)
    return state.out
  }
}

// // ::- This is an object used to track state and expose
// // methods related to markdown serialization. Instances are passed to
// // node and mark serialization methods (see `toMarkdown`).
class MarkdownSerializerState {
  nodes: NodeSerializers
  marks: MarkSerializers
  options: SerializerOptions
  delim: string
  out: string
  closed: boolean | Node
  inTightList: boolean
  options: SerializerOptions
  constructor(
    nodes: NodeSerializers,
    marks: MarkSerializers,
    options?: SerializerOptions
  ) {
    this.nodes = nodes
    this.marks = marks
    this.delim = this.out = ""
    this.closed = false
    this.inTightList = false
    // :: Object
    // The options passed to the serializer.
    //   tightLists:: ?bool
    //   Whether to render lists in a tight style. This can be overridden
    //   on a node level by specifying a tight attribute on the node.
    //   Defaults to false.
    this.options = options || {}
    if (typeof this.options.tightLists == "undefined")
      this.options.tightLists = false
  }
  flushClose(n?: number) {
    let size = n
    if (this.closed) {
      if (!this.atBlank()) this.out += "\n"
      if (size == null) size = 2
      if (size > 1) {
        let delimMin = this.delim
        let trim = /\s+$/.exec(delimMin)
        if (trim) delimMin = delimMin.slice(0, delimMin.length - trim[0].length)
        for (let i = 1; i < size; i++) this.out += delimMin + "\n"
      }
      this.closed = false
    }
  }
  // :: (string, ?string, Node, ())
  // Render a block, prefixing each line with `delim`, and the first
  // line in `firstDelim`. `node` should be the node that is closed at
  // the end of the block, and `f` is a function that renders the
  // content of the block.
  wrapBlock(delim: string, firstDelim: ?string, node: Node, f: () => void) {
    let old = this.delim
    this.write(firstDelim || delim)
    this.delim += delim
    f()
    this.delim = old
    this.closeBlock(node)
  }
  atBlank(): boolean {
    return /(^|\n)$/.test(this.out)
  }
  // :: ()
  // Ensure the current content ends with a newline.
  ensureNewLine(): void {
    if (!this.atBlank()) this.out += "\n"
  }
  // :: (?string)
  // Prepare the state for writing output (closing closed paragraphs,
  // adding delimiters, and so on), and then optionally add content
  // (unescaped) to the output.
  write(content?: string) {
    this.flushClose()
    if (this.delim && this.atBlank()) this.out += this.delim
    if (content) this.out += content
  }
  // :: (Node)
  // Close the block for the given node.
  closeBlock(node?: Node): void {
    this.closed = node != null
  }
  // :: (string, ?bool)
  // Add the given text to the document. When escape is not `false`,
  // it will be escaped.
  text(text: string = "", escape?: boolean) {
    let lines = text.split("\n")
    for (let i = 0; i < lines.length; i++) {
      var startOfLine = this.atBlank() || this.closed
      this.write()
      this.out +=
        escape !== false ? this.esc(lines[i], !!startOfLine) : lines[i]
      if (i != lines.length - 1) this.out += "\n"
    }
  }
  // :: (Node)
  // Render the given node as a block.
  render(node: Node, parent: Node | Fragment, index: number): void {
    if (typeof parent == "number") throw new Error("!")
    if (!node.marks.some(mark => this.marks[mark.type.name].ignore)) {
      const nodeSerializer = this.nodes[node.type.name]
      if (nodeSerializer) {
        nodeSerializer(this, node, parent, index)
      } else {
        throw RangeError(`Serializer for "${node.type.name}" node not found`)
      }
    }
  }
  // :: (Node)
  // Render the contents of `parent` as block nodes.
  renderContent(parent: Node | Fragment): void {
    parent.forEach((node, _, i) => this.render(node, parent, i))
  }
  // :: (Node)
  // Render the contents of `parent` as inline content.
  renderInline(parent: Node): void {
    this.renderContentInline(parent, parent.marks)
  }
  renderContentInline(
    parent: Node | Fragment,
    parentMarks: Mark[] = Mark.none
  ): void {
    let active = parentMarks.slice()
    let trailing = ""
    let progress = (child: ?Node, _: number, index: number): void => {
      let node = child
      let marks = node ? node.marks : parentMarks.slice()
      let leading = trailing
      trailing = ""

      if (marks.some(mark => this.marks[mark.type.name].ignore)) {
        return
      }

      // If whitespace has to be expelled from the node, adjust
      // leading and trailing accordingly.
      if (
        node &&
        node.isText &&
        marks.some(mark => {
          let info = this.marks[mark.type.name]
          return info && info.expelEnclosingWhitespace
        })
      ) {
        let [_, lead, inner, trail] = (/^(\s*)(.*?)(\s*)$/.exec(
          node.text || node.textContent
        ): string[])
        leading += lead
        trailing = trail
        if (lead || trail) {
          // We know it's a TextNode since `isText` and we know that TextNode
          // has `withText` method, but unfortunately `TextNode` is not exposed
          // nor above invariant is expressed in types so we resort to :any.
          node = inner ? ((node: any).withText(inner): Node) : null
          if (!node) marks = active
        }
      }

      let code =
        marks.length &&
        (marks[marks.length - 1].type.spec.group || "").includes("code") &&
        marks[marks.length - 1]

      let len = marks.length - (code ? 1 : 0)
      // Try to reorder 'mixable' marks, such as em and strong, which
      // in Markdown may be opened and closed in different order, so
      // that order of the marks for the token matches the order in
      // active.
      for (let i = 0; i < len; i++) {
        let mark = marks[i]
        if (!this.marks[mark.type.name].mixable) break
        for (let j = 0; j < active.length; j++) {
          let other = active[j]
          if (!this.marks[other.type.name].mixable) break
          if (mark.eq(other)) {
            if (i > j)
              marks = marks
                .slice(0, j)
                .concat(mark)
                .concat(marks.slice(j, i))
                .concat(marks.slice(i + 1, len))
            else if (j > i)
              marks = marks
                .slice(0, i)
                .concat(marks.slice(i + 1, j))
                .concat(mark)
                .concat(marks.slice(j, len))
            else break
          }
        }
      }
      // Find the prefix of the mark set that didn't change
      let keep = 0
      while (
        keep < Math.min(active.length, len) &&
        marks[keep].eq(active[keep])
      ) {
        ++keep
      }
      // Close the marks that need to be closed
      while (keep < active.length) {
        this.text(this.markString(active.pop(), false), false)
      }
      // Output any previously expelled trailing whitespace outside the marks
      if (leading) {
        this.text(leading)
      }
      // Open the marks that need to be opened
      if (node) {
        while (active.length < len) {
          let add = marks[active.length]
          active.push(add)
          this.text(this.markString(add, true), false)
        }
        // Render the node. Special case code marks, since their content
        // may not be escaped.
        if (code && node.isText) {
          this.text(
            this.markString(code, false) +
              (node.text || node.textContent) +
              this.markString(code, true),
            false
          )
        } else {
          this.render(node, parent, index)
        }
      }
    }

    parent.forEach(progress)
    progress(null, -1, -1)
  }
  // :: (Node, string, (number) → string)
  // Render a node's content as a list. `delim` should be the extra
  // indentation added to all lines except the first in an item,
  // `firstDelim` is a function going from an item index to a
  // delimiter for the first line of the item.
  renderList(node: Node, delim: string, firstDelim: (Node, number) => string) {
    if (this.closed && this.closed.type == node.type) this.flushClose(3)
    else if (this.inTightList) this.flushClose(1)
    let isTight =
      typeof node.attrs.tight != "undefined"
        ? node.attrs.tight
        : this.options.tightLists
    let prevTight = this.inTightList
    this.inTightList = Boolean(isTight)
    node.forEach((child, _, i) => {
      if (i && isTight) this.flushClose(1)
      this.wrapBlock(delim, firstDelim(child, i), node, () =>
        this.render(child, node, i)
      )
    })
    this.inTightList = prevTight
  }
  // :: (string, ?bool) → string
  // Escape the given string so that it can safely appear in Markdown
  // content. If `startOfLine` is true, also escape characters that
  // has special meaning only at the start of the line.
  esc(input: string, startOfLine?: boolean): string {
    let str = input.replace(/[`*\\~\[\]]/g, "\\$&")
    if (startOfLine)
      str = str.replace(/^[:#-*+]/, "\\$&").replace(/^(\d+)\./, "$1\\.")
    return str
  }
  quote(str: string): string {
    var wrap =
      str.indexOf('"') == -1 ? '""' : str.indexOf("'") == -1 ? "''" : "()"
    return wrap[0] + str + wrap[1]
  }
  // :: (string, number) → string
  // Repeat the given string `n` times.
  repeat(str: string, n: number): string {
    let out = ""
    for (let i = 0; i < n; i++) out += str
    return out
  }
  // : (Mark, bool) → string
  // Get the markdown string for a given opening or closing mark.
  markString(mark: Mark, open: boolean): string {
    let info = this.marks[mark.type.name]
    let value = open ? info.open : info.close
    return typeof value == "string" ? value : value(this, mark)
  }
  // :: (string) → { leading: ?string, trailing: ?string }
  // Get leading and trailing whitespace from a string. Values of
  // leading or trailing property of the return object will be undefined
  // if there is no match.
  getEnclosingWhitespace(
    text: string
  ): { leading: ?string, trailing: ?string } {
    return {
      leading: (text.match(/^(\s+)/) || [])[0],
      trailing: (text.match(/(\s+)$/) || [])[0]
    }
  }
}

export type Serializer = MarkdownSerializer
