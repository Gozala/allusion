// @flow strict

import schema from "./Schema"
import MarkdownIt from "markdown-it"
import type { Token } from "markdown-it"
import { Mark, MarkType } from "prosemirror-model"
import type { Schema, NodeType, Node, Fragment } from "prosemirror-model"

function maybeMerge(a, b) {
  if (a.isText && b.isText && Mark.sameSet(a.marks, b.marks)) {
    const fragment: any = (a: any).text + (b: any).text
    return a.copy(fragment)
  }
}

type Attributes = { [string]: mixed }

type TokenHandle = (MarkdownParseState, Token) => void

type TokenHandlers = { [string]: TokenHandle }
type Stack = {
  type: NodeType,
  attrs?: Attributes,
  content: Array<Node>
}[]

type TokenSpec =
  | {
      block: string,
      node?: void,
      mark?: void,
      ignore?: boolean,
      attrs?: Attributes,
      getAttrs?: Token => Attributes
    }
  | {
      block?: void,
      node: string,
      mark?: void,
      ignore?: boolean,
      attrs?: { [string]: mixed },
      getAttrs?: Token => Attributes
    }
  | {
      block?: void,
      node?: void,
      mark: string,
      ignore?: boolean,
      attrs?: Attributes,
      getAttrs?: Token => Attributes
    }

// Object used to track the context of a running parse.
export class MarkdownParseState {
  schema: Schema
  marks: Mark[]
  tokenHandlers: TokenHandlers
  stack: Stack
  constructor(schema: Schema, tokenHandlers: TokenHandlers, root: NodeType) {
    this.schema = schema
    this.stack = [{ type: root, content: [] }]
    this.marks = Mark.none
    this.tokenHandlers = tokenHandlers
  }

  top() {
    return this.stack[this.stack.length - 1]
  }

  push(elt: Node) {
    if (this.stack.length) this.top().content.push(elt)
  }

  // : (string)
  // Adds the given text to the current position in the document,
  // using the current marks as styling.
  addText(text: string) {
    if (!text) return
    let nodes = this.top().content,
      last = nodes[nodes.length - 1]
    let node = this.schema.text(text, this.marks),
      merged
    if (last && (merged = maybeMerge(last, node)))
      nodes[nodes.length - 1] = merged
    else nodes.push(node)
  }

  // : (Mark)
  // Adds the given mark to the set of active marks.
  openMark(mark: Mark) {
    this.marks = mark.addToSet(this.marks)
  }

  // : (Mark)
  // Removes the given mark from the set of active marks.
  closeMark(mark: MarkType) {
    this.marks = mark.removeFromSet(this.marks)
  }

  parseTokens(toks: Token[]) {
    for (let i = 0; i < toks.length; i++) {
      let tok = toks[i]
      let handler = this.tokenHandlers[tok.type]
      if (!handler)
        throw new Error(
          "Token type `" + tok.type + "` not supported by Markdown parser"
        )
      handler(this, tok)
    }
  }

  // : (NodeType, ?Object, ?[Node]) → ?Node
  // Add a node at the current position.
  addNode(type: NodeType, attrs?: Attributes, content?: Node[]) {
    let node = type.createAndFill(attrs, content, this.marks)
    if (!node) return null
    this.push(node)
    return node
  }

  // : (NodeType, ?Object)
  // Wrap subsequent content in a node of the given type.
  openNode(type: NodeType, attrs?: Attributes) {
    this.stack.push({ type, attrs: attrs, content: [] })
  }

  // : () → ?Node
  // Close and return the node that is currently on top of the stack.
  closeNode(): ?Node {
    if (this.marks.length) this.marks = Mark.none
    let info = this.stack.pop()
    return this.addNode(info.type, info.attrs, info.content)
  }
}

function attrs(spec: TokenSpec, token: Token) {
  if (spec.getAttrs) return spec.getAttrs(token)
  else if (spec.attrs instanceof Function)
    // For backwards compatibility when `attrs` is a Function
    return spec.attrs(token)
  else return spec.attrs
}

// Code content is represented as a single token with a `content`
// property in Markdown-it.
function noOpenClose(type) {
  return type == "code_inline" || type == "code_block" || type == "fence"
}

function withoutTrailingNewline(str) {
  return str[str.length - 1] == "\n" ? str.slice(0, str.length - 1) : str
}

function noOp() {}

function tokenHandlers(schema, tokens) {
  let handlers: TokenHandlers = (Object.create(null): Object)
  for (let type in tokens) {
    let spec = tokens[type]
    if (spec.block) {
      let nodeType = schema.nodeType(spec.block)
      if (noOpenClose(type)) {
        handlers[type] = (state, tok) => {
          state.openNode(nodeType, attrs(spec, tok))
          state.addText(withoutTrailingNewline(tok.content))
          state.closeNode()
        }
      } else {
        handlers[type + "_open"] = (state, tok) => {
          state.openNode(nodeType, attrs(spec, tok))
        }
        handlers[type + "_close"] = state => {
          state.closeNode()
        }
      }
    } else if (spec.node) {
      let nodeType = schema.nodeType(spec.node)
      handlers[type] = (state, tok) => {
        state.openNode(nodeType, attrs(spec, tok))
        state.closeNode()
      }
    } else if (spec.mark) {
      let markType = schema.marks[spec.mark]
      if (noOpenClose(type)) {
        handlers[type] = (state, tok) => {
          state.openMark(markType.create(attrs(spec, tok)))
          state.addText(withoutTrailingNewline(tok.content))
          state.closeMark(markType)
        }
      } else {
        handlers[type + "_open"] = (state, tok) => {
          state.openMark(markType.create(attrs(spec, tok)))
        }
        handlers[type + "_close"] = (state, tok) => {
          state.closeMark(markType)
        }
      }
    } else if (spec.ignore) {
      if (noOpenClose(type)) {
        handlers[type] = noOp
      } else {
        handlers[type + "_open"] = noOp
        handlers[type + "_close"] = noOp
      }
    } else {
      throw new RangeError("Unrecognized parsing spec " + JSON.stringify(spec))
    }
  }

  handlers.text = (state, tok) => state.addText(tok.content)
  handlers.inline = (state, tok) => state.parseTokens(tok.children)
  handlers.softbreak = state => state.addText("\n")

  return handlers
}

// ::- A configuration of a Markdown parser. Such a parser uses
// [markdown-it](https://github.com/markdown-it/markdown-it) to
// tokenize a file, and then runs the custom rules it is given over
// the tokens to create a ProseMirror document tree.
export class MarkdownParser {
  tokens: Object
  schema: Schema
  tokenizer: MarkdownIt
  tokenHandlers: TokenHandlers
  // :: (Schema, MarkdownIt, Object)
  // Create a parser with the given configuration. You can configure
  // the markdown-it parser to parse the dialect you want, and provide
  // a description of the ProseMirror entities those tokens map to in
  // the `tokens` object, which maps token names to descriptions of
  // what to do with them. Such a description is an object, and may
  // have the following properties:
  //
  // **`node`**`: ?string`
  //   : This token maps to a single node, whose type can be looked up
  //     in the schema under the given name. Exactly one of `node`,
  //     `block`, or `mark` must be set.
  //
  // **`block`**`: ?string`
  //   : This token comes in `_open` and `_close` variants (which are
  //     appended to the base token name provides a the object
  //     property), and wraps a block of content. The block should be
  //     wrapped in a node of the type named to by the property's
  //     value.
  //
  // **`mark`**`: ?string`
  //   : This token also comes in `_open` and `_close` variants, but
  //     should add a mark (named by the value) to its content, rather
  //     than wrapping it in a node.
  //
  // **`attrs`**`: ?Object`
  //   : Attributes for the node or mark. When `getAttrs` is provided,
  //     it takes precedence.
  //
  // **`getAttrs`**`: ?(MarkdownToken) → Object`
  //   : A function used to compute the attributes for the node or mark
  //     that takes a [markdown-it
  //     token](https://markdown-it.github.io/markdown-it/#Token) and
  //     returns an attribute object.
  //
  // **`ignore`**`: ?bool`
  //   : When true, ignore content for the matched token.
  constructor(
    schema: Schema,
    tokenizer: MarkdownIt,
    tokens: { [string]: TokenSpec }
  ) {
    // :: Object The value of the `tokens` object used to construct
    // this parser. Can be useful to copy and modify to base other
    // parsers on.
    this.tokens = tokens
    this.schema = schema
    this.tokenizer = tokenizer
    this.tokenHandlers = tokenHandlers(schema, tokens)
  }

  // :: (string) → Node
  // Parse a string as [CommonMark](http://commonmark.org/) markup,
  // and create a ProseMirror document as prescribed by this parser's
  // rules.
  parse(text: string): Node {
    return this.parseTokens(this.tokenizer.parse(text, {}))
  }
  parseInline(text: string): Fragment {
    const tokens = this.tokenizer.parseInline(text, {})[0].children
    const root =
      tokens[0] && tokens[0].block
        ? this.schema.nodeType("block+")
        : this.schema.nodeType("inline+")

    return this.parseTokens(tokens, root).content
  }
  parseTokens(tokens: Token[], root: NodeType = this.schema.topNodeType): Node {
    const state = new MarkdownParseState(this.schema, this.tokenHandlers, root)
    let doc

    state.parseTokens(tokens)
    do {
      doc = state.closeNode()
    } while (state.stack.length)
    return (doc: any)
  }
}

export const parser = new MarkdownParser(
  schema,
  new MarkdownIt({ html: false }),
  {
    blockquote: { block: "blockquote" },
    paragraph: { block: "paragraph" },
    list_item: { block: "list_item" },
    bullet_list: { block: "bullet_list" },
    ordered_list: {
      block: "ordered_list",
      getAttrs: tok => ({ order: +tok.attrGet("order") || 1 })
    },
    heading: {
      block: "heading",
      getAttrs: tok => ({ level: +tok.tag.slice(1) })
    },
    code_block: { block: "code_block" },
    fence: {
      block: "code_block",
      getAttrs: tok => ({ params: tok.info || "" })
    },
    hr: { node: "horizontal_rule" },
    image: {
      node: "image",
      getAttrs: tok => ({
        src: tok.attrGet("src"),
        title: tok.attrGet("title") || null,
        alt: (tok.children[0] && tok.children[0].content) || null
      })
    },
    hardbreak: { node: "hard_break" },

    em: { mark: "em" },
    strong: { mark: "strong" },
    s: { mark: "strike_through" },
    link: {
      mark: "link",
      getAttrs: tok => ({
        href: tok.attrGet("href"),
        title: tok.attrGet("title") || null
      })
    },
    code_inline: { mark: "code" }
  }
)
