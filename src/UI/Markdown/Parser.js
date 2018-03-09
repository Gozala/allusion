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

type Attributes = { [string]: null | void | boolean | number | string }

type TokenHandlers = { [string]: TokenHandler }
type TokenDecoder<a> = Token => a
type NodeEncoder<a> = (a, Node[], Mark[]) => Node

interface Parser {
  schema: Schema;
  parseTokens(Token[]): void;
  addText(string): void;
  openMark(MarkType, ?Attributes): void;
  closeMark(MarkType): void;
  openNode(NodeFactory, Token): void;
  closeNode(): ?Node;
}

interface TokenHandler {
  handleToken(Parser, Token): void;
}

interface NodeFactory {
  create(Token, Node[], Mark[]): Node;
}

type TokenFrame = {
  content: Node[],
  token: Token,
  factory: NodeFactory
}

type Stack = TokenFrame[]

// Object used to track the context of a running parse.
export class MarkdownParseState implements Parser {
  schema: Schema
  marks: Mark[]
  tokenHandlers: TokenHandlers
  stack: Stack
  constructor(schema: Schema, tokenHandlers: TokenHandlers, root: NodeType) {
    this.schema = schema
    this.stack = [
      {
        factory: Attributor.new(root),
        content: [],
        token: (null: any)
      }
    ]
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
  openMark(markType: MarkType, attributes: ?Attributes) {
    this.marks = markType.create(attributes).addToSet(this.marks)
  }

  // : (MarkType)
  // Removes the given mark from the set of active marks.
  closeMark(markType: MarkType) {
    this.marks = markType.removeFromSet(this.marks)
  }

  parseTokens(toks: Token[]) {
    for (let i = 0; i < toks.length; i++) {
      let tok = toks[i]
      let handler = this.tokenHandlers[tok.type]
      if (!handler)
        throw new Error(
          "Token type `" + tok.type + "` not supported by Markdown parser"
        )
      handler.handleToken(this, tok)
    }
  }

  // : (NodeType, ?Object, ?[Node]) → ?Node
  // Add a node at the current position.
  addNode(factory: NodeFactory, token: Token, content: Node[]): ?Node {
    let node = factory.create(token, content, this.marks)
    if (!node) return null
    this.push(node)
    return node
  }

  openNode(factory: NodeFactory, token: Token): void {
    this.stack.push({ token, factory, content: [] })
  }

  // : () → ?Node
  // Close and return the node that is currently on top of the stack.
  closeNode(): ?Node {
    if (this.marks.length) {
      this.marks = Mark.none
    }
    const { factory, token, content } = this.stack.pop()
    return this.addNode(factory, token, content)
  }
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

function tokenHandlers(tokens) {
  let handlers: TokenHandlers = (Object.create(null): Object)
  for (const type in tokens) {
    const handler = tokens[type]
    handlers[`${type}_open`] = handler
    handlers[`${type}_close`] = handler
    handlers[type] = handler
  }

  handlers.text = Text
  handlers.inline = InlineContent
  handlers.softbreak = SoftBreak

  return handlers
}

const OPEN = 1
const ATOMIC = 0
const CLOSE = -1

class Text {
  static handleToken(parser: Parser, token: Token) {
    parser.addText(token.content)
  }
}

class SoftBreak {
  static handleToken(parser: Parser, token: Token) {
    parser.addText("\n")
  }
}

class InlineContent {
  static handleToken(parser: Parser, token: Token) {
    parser.parseTokens(token.children)
  }
}

class Block<a> implements TokenHandler, NodeFactory {
  nodeType: NodeType
  decode: TokenDecoder<a>
  +encode: NodeEncoder<a>
  code: boolean
  constructor(nodeType: NodeType, decoder: TokenDecoder<a>) {
    this.nodeType = nodeType
    this.code = nodeType.spec.code === true
    this.decode = decoder
  }
  openNode(parser: Parser, token: Token) {
    parser.openNode(this, token)
  }
  closeNode(parser: Parser, token: Token) {
    parser.closeNode()
  }
  createNode(parser: Parser, token: Token) {
    this.openNode(parser, token)
    if (this.code) {
      parser.addText(withoutTrailingNewline(token.content))
    }
    this.closeNode(parser, token)
  }
  handleToken(parser: Parser, token: Token) {
    switch (token.nesting) {
      case OPEN:
        return this.openNode(parser, token)
      case ATOMIC:
        return this.createNode(parser, token)
      case CLOSE:
        return this.closeNode(parser, token)
      default:
        throw new Error(
          `Token ${token.type} has invalid nesting ${token.nesting}`
        )
    }
  }
  create(token: Token, content: Node[], marks: Mark[]): Node {
    return this.encode(this.decode(token), content, marks)
  }
}

class Custom<a> extends Block<a> {
  static new<a>(
    nodeType: NodeType,
    decoder: TokenDecoder<a>,
    encoder: NodeEncoder<a>
  ): Block<a> {
    return new Custom(nodeType, decoder, encoder)
  }
  constructor(
    nodeType: NodeType,
    decoder: TokenDecoder<a>,
    encoder: NodeEncoder<a>
  ) {
    super(nodeType, decoder)
    this.encode = encoder
  }
}

class Attributor extends Block<?Attributes> {
  static new(
    nodeType: NodeType,
    decoder: TokenDecoder<?Attributes> = Void
  ): Attributor {
    return new Attributor(nodeType, decoder)
  }
  encode(attributes: ?Attributes, content: Node[], marks: Mark[]): Node {
    return this.nodeType.createAndFill(attributes, content, marks)
  }
}

const Void = () => {}

class Inline implements TokenHandler {
  code: boolean
  markType: MarkType
  decode: Token => ?Attributes
  static new(
    markType: MarkType,
    decoder: TokenDecoder<?Attributes> = Void
  ): TokenHandler {
    return new Inline(markType, decoder)
  }
  constructor(markType: MarkType, decode: TokenDecoder<?Attributes>) {
    this.markType = markType
    this.decode = decode
    this.code = (markType.spec.group || "").includes("code")
  }
  openMark(parser: Parser, token: Token) {
    parser.openMark(this.markType, this.decode(token))
  }
  closeMark(parser: Parser, token: Token) {
    parser.closeMark(this.markType)
  }
  mark(parser: Parser, token: Token) {
    this.openMark(parser, token)
    if (this.code) {
      parser.addText(withoutTrailingNewline(token.content))
    }
    this.closeMark(parser, token)
  }
  handleToken(parser: Parser, token: Token) {
    switch (token.nesting) {
      case OPEN:
        return this.openMark(parser, token)
      case ATOMIC:
        return this.mark(parser, token)
      case CLOSE:
        return this.closeMark(parser, token)
      default:
        throw new Error(
          `Token ${token.type} has invalid nesting ${token.nesting}`
        )
    }
  }
}

// ::- A configuration of a Markdown parser. Such a parser uses
// [markdown-it](https://github.com/markdown-it/markdown-it) to
// tokenize a file, and then runs the custom rules it is given over
// the tokens to create a ProseMirror document tree.
export class MarkdownParser {
  static node = Attributor.new
  static mark = Inline.new
  static custom = Custom.new

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
  constructor(schema: Schema, tokenizer: MarkdownIt, tokens: TokenHandlers) {
    // :: Object The value of the `tokens` object used to construct
    // this parser. Can be useful to copy and modify to base other
    // parsers on.
    this.tokens = tokens
    this.schema = schema
    this.tokenizer = tokenizer
    this.tokenHandlers = tokenHandlers(tokens)
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
    blockquote: MarkdownParser.node(schema.nodes.blockquote),
    paragraph: MarkdownParser.node(schema.nodes.paragraph),
    list_item: MarkdownParser.node(schema.nodes.list_item),
    bullet_list: MarkdownParser.node(schema.nodes.bullet_list),
    ordered_list: MarkdownParser.node(schema.nodes.ordered_list, tok => ({
      order: +tok.attrGet("order") || 1
    })),
    heading: MarkdownParser.node(schema.nodes.heading, tok => ({
      level: +tok.tag.slice(1)
    })),
    code_block: MarkdownParser.node(schema.nodes.code_block),
    fence: MarkdownParser.node(schema.nodes.code_block, tok => ({
      params: tok.info || ""
    })),
    hr: MarkdownParser.node(schema.nodes.horizontal_rule),
    image: MarkdownParser.node(schema.nodes.image, tok => ({
      src: tok.attrGet("src"),
      title: tok.attrGet("title") || null,
      alt: (tok.children[0] && tok.children[0].content) || null
    })),
    hardbreak: MarkdownParser.node(schema.nodes.hard_break),
    em: MarkdownParser.mark(schema.marks.em),
    strong: MarkdownParser.mark(schema.marks.strong),
    s: MarkdownParser.mark(schema.marks.strike_through),
    link: MarkdownParser.mark(schema.marks.link, tok => ({
      href: tok.attrGet("href"),
      title: tok.attrGet("title") || null
    })),
    code_inline: MarkdownParser.mark(schema.marks.code)
  }
)
