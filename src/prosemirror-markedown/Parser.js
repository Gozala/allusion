// @flow strict

import Tokenizer from "markdown-it"
import type { Token } from "markdown-it"
import { Mark, Fragment, MarkType, NodeType } from "prosemirror-model"
import type { Node } from "prosemirror-model"
import type {
  Schema,
  NodeParseRule,
  MarkParseRule,
  AttributeParseRule
} from "./Schema"
import {
  withoutTrailingNewline,
  priority,
  insertByPriority,
  concat
} from "./Parser/Util"
import always from "always.flow"
import panic from "panic.flow"

type TokenHandlers = { [string]: Rule[] }
type Decoder<a, b> = a => ?b
type TokenDecoder<a> = Decoder<Token, a>
type NodeEncoder<a> = (Schema, a, Node[], Mark[]) => Node
type MarkEncoder<a> = (Schema, a, Mark[]) => [Node[], 0, Node[]]

export interface Parser {
  marks: Mark[];
  content: Node[];
  schema: Schema;
  appendNode(node: Node): Parser;
  appendText(text: string): Parser;
  enter(): Parser;
  exit(): Parser;
}

class FragmentParser implements Parser {
  schema: Schema
  content: Node[]
  marks: Mark[]
  constructor(schema: Schema, content: Node[], marks: Mark[]) {
    this.schema = schema
    this.marks = marks
    this.content = content
  }
  appendFragment(nodes: Node[]) {
    for (const node of nodes) {
      this.content.push(node)
    }
  }
  appendNode(node: Node) {
    this.content.push(node)
    return this
  }
  appendText(text: string) {
    if (text !== "") {
      const { content } = this
      const last = content[content.length - 1]

      const node = this.schema.text(text, this.marks)
      const merged = last ? concat(last, node) : null

      if (merged) {
        content[content.length - 1] = merged
      } else {
        content.push(node)
      }
    }
    return this
  }
  enter() {
    return this
  }
  exit() {
    return this
  }
}

class NodeParser<a> extends FragmentParser {
  rule: NodeRule<a>
  attributes: a
  parent: Parser

  constructor(
    parent: Parser,
    rule: NodeRule<a>,
    attributes: a,
    content: Node[],
    marks: Mark[]
  ) {
    super(parent.schema, content, marks)
    this.parent = parent
    this.rule = rule
    this.attributes = attributes
  }
  static new(
    parent: Parser,
    rule: NodeRule<a>,
    attributes: a,
    content: Node[] = [],
    marks: Mark[] = Mark.none
  ): NodeParser<a> {
    return new this(parent, rule, attributes, content, marks)
  }

  enter() {
    return this
  }
  exit() {
    return this.parent.appendNode(
      this.rule.encodeNode(
        this.schema,
        this.attributes,
        this.content,
        this.parent.marks
      )
    )
  }

  create(): Node {
    return this.rule.encodeNode(
      this.schema,
      this.attributes,
      this.content,
      this.marks
    )
  }
}

class MarkParser<a: Object> extends FragmentParser {
  rule: MarkRule<a>
  attributes: a
  parent: Parser
  markup: void | Node[]
  static new(parent: Parser, rule: MarkRule<a>, attributes: a) {
    return new this(
      parent,
      rule,
      attributes,
      parent.content,
      rule.markType.create(attributes).addToSet(parent.marks)
    )
  }
  constructor(
    parent: Parser,
    rule: MarkRule<a>,
    attributes: a,
    content: Node[],
    marks: Mark[]
  ) {
    super(parent.schema, content, marks)
    this.parent = parent
    this.rule = rule
    this.attributes = attributes
  }

  addMarkup(markup: string) {
    if (markup !== "") {
      const { schema, marks } = this
      return this.appendNode(
        schema.text(markup, [
          schema.mark("markup", {
            class: "markup inline",
            marks
          })
        ])
      )
    }
    return this
  }
  exit(): Parser {
    if (this.markup) {
      this.appendFragment(this.markup)
    } else if (this.attributes.markup) {
      this.addMarkup(this.attributes.markup)
    }
    return this.parent
  }
  enter(): Parser {
    const { encodeMarkup } = this.rule
    if (encodeMarkup) {
      const [openingMarkup, _, closingMarkup] = encodeMarkup(
        this.schema,
        this.attributes,
        this.marks
      )
      this.markup = closingMarkup
      this.appendFragment(openingMarkup)
    } else if (this.attributes.markup) {
      this.addMarkup(this.attributes.markup)
    }
    return this
  }
}

const OPEN = 1
const ATOMIC = 0
const CLOSE = -1

type Rule = NodeRule<*> | MarkRule<*>
type Rules = Rule[]

class NodeRule<a> {
  schema: Schema
  type: string
  priority: number
  tag: ?string

  decodeToken: TokenDecoder<a>
  encodeNode: NodeEncoder<a>

  constructor(
    schema: Schema,
    type: string,
    priority: number,
    tag: ?string,
    decodeToken: TokenDecoder<a>,
    encodeNode: NodeEncoder<a>
  ) {
    this.type = type
    this.priority = priority
    this.tag = tag
    this.decodeToken = decodeToken
    this.encodeNode = encodeNode
  }
  match(token: Token, schema: Schema, top: Parser): ?Parser {
    if (this.tag == null || this.tag === token.tag) {
      const attributes = this.decodeToken(token)
      if (attributes != null) {
        return NodeParser.new(top, this, attributes)
      }
    }
    return null
  }

  static createEncoder<a: Object>(nodeType: NodeType): NodeEncoder<a> {
    return (
      schema: Schema,
      attributes: a,
      content: Node[],
      marks: Mark[]
    ): Node => nodeType.createChecked(attributes, content, marks)
  }

  static fromAttributeRule(
    rule: AttributeParseRule,
    name: string,
    schema: Schema
  ): NodeRule<Object> {
    const { type, tag } = rule
    const decodeToken = createAttributeTokenDecoder(rule, always.EmptyTable)
    const encodeNode = this.createEncoder(schema.nodes[name])
    return new NodeRule(
      schema,
      type,
      priority(rule),
      tag,
      decodeToken,
      encodeNode
    )
  }
  static fromNodeRule<a>(
    rule: NodeParseRule<a>,
    name: string,
    schema: Schema
  ): NodeRule<a> {
    const { type, tag, createNode, getAttrs, attrs } = rule
    const decodeToken = attrs != null ? always(attrs) : getAttrs
    return new NodeRule(
      schema,
      type,
      priority(rule),
      tag,
      decodeToken,
      createNode
    )
  }
}

class MarkRule<a: Object> {
  schema: Schema
  type: string
  priority: number
  tag: ?string
  markType: MarkType

  decodeToken: TokenDecoder<a>
  encodeMarkup: ?MarkEncoder<a>

  constructor(
    schema: Schema,
    type: string,
    priority: number,
    tag: ?string,
    markType: MarkType,
    decodeToken: TokenDecoder<a>,
    encodeMarkup: ?MarkEncoder<a>
  ) {
    this.type = type
    this.priority = priority
    this.tag = tag
    this.markType = markType
    this.decodeToken = decodeToken
    this.encodeMarkup = encodeMarkup
  }
  match(token: Token, schema: Schema, top: Parser): ?Parser {
    if (this.tag == null || this.tag === token.tag) {
      const attributes = this.decodeToken(token)
      if (attributes != null) {
        return MarkParser.new(top, this, attributes)
      }
    }
  }

  static fromAttributeRule(
    rule: AttributeParseRule,
    name: string,
    schema: Schema
  ): MarkRule<Object> {
    const { type, tag } = rule
    const markType = schema.marks[name]
    const decodeToken = createAttributeTokenDecoder(rule, always.EmptyTable)

    return new MarkRule(
      schema,
      type,
      priority(rule),
      tag,
      markType,
      decodeToken
    )
  }
  static fromMarkRule<a: Object>(
    rule: MarkParseRule<a>,
    name: string,
    schema: Schema
  ): MarkRule<a> {
    const { type, tag, attrs, getAttrs } = rule
    const markType = schema.marks[name]
    const decodeToken = attrs != null ? always(attrs) : getAttrs

    return new MarkRule(
      schema,
      type,
      priority(rule),
      tag,
      markType,
      decodeToken,
      rule.createMarkup
    )
  }
  static encodeMark(markType: MarkType, attributes: Object): Mark {
    return markType.create(attributes)
  }
}

type ParseRule<a> =
  | (AttributeParseRule & { mark: string, node?: void })
  | (AttributeParseRule & { mark?: void, node: string })
  | (MarkParseRule<a> & { mark: string, node?: void })
  | (NodeParseRule<a> & { mark?: void, node: string })

// ::- A configuration of a Markdown parser. Such a parser uses
// [markdown-it](https://github.com/markdown-it/markdown-it) to
// tokenize a file, and then runs the custom rules it is given over
// the tokens to create a ProseMirror document tree.
export default class MarkdownParser extends FragmentParser {
  rules: ?Rules
  schema: Schema
  tokenizer: Tokenizer
  handlers: TokenHandlers
  top: Parser

  constructor(
    schema: Schema,
    tokenizer: Tokenizer,
    handlers: TokenHandlers,
    rules?: Rules
  ) {
    super(schema, [], Mark.none)

    this.tokenizer = tokenizer
    this.handlers = handlers
    this.rules = rules
    this.top = this
  }
  static fromSchema(schema: Schema, tokenizer: Tokenizer): MarkdownParser {
    return new this(
      schema,
      tokenizer,
      this.ruleHandlers(this.schemaRules(schema))
    )
  }
  static fromRules(
    schema: Schema,
    tokenizer: Tokenizer,
    rules: ParseRule<*>[]
  ) {
    return new this(
      schema,
      tokenizer,
      this.ruleHandlers(rules.map(rule => this.toRule(rule, schema)))
    )
  }
  static toRule(rule: ParseRule<*>, schema: Schema): Rule {
    if (rule.createNode) {
      return NodeRule.fromNodeRule(rule, rule.node, schema)
    } else if (rule.node) {
      return NodeRule.fromAttributeRule(rule, rule.node, schema)
    } else if (rule.createMarkup) {
      return MarkRule.fromMarkRule(rule, rule.mark, schema)
    } else if (rule.mark) {
      return MarkRule.fromAttributeRule(rule, rule.mark, schema)
    } else {
      return panic(
        RangeError(
          `Invalid ParseRule was supplied: ${JSON.stringify(
            rule
          )}. It must have either "node" or "mark" string property`
        )
      )
    }
  }
  static schemaRules(schema: Schema): Rules {
    let rules = []
    const { nodes, marks } = schema.markdownSpec

    for (const name in marks) {
      const { parseMarkdown } = marks[name]
      if (parseMarkdown) {
        for (const rule of parseMarkdown) {
          const markRule = rule.createMarkup
            ? MarkRule.fromMarkRule(rule, name, schema)
            : MarkRule.fromAttributeRule(rule, name, schema)
          rules = insertByPriority(markRule, rules)
        }
      }
    }

    for (const name in nodes) {
      const { parseMarkdown } = nodes[name]
      if (parseMarkdown) {
        for (const rule of parseMarkdown) {
          const nodeRule = rule.createNode
            ? NodeRule.fromNodeRule(rule, name, schema)
            : NodeRule.fromAttributeRule(rule, name, schema)
          rules = insertByPriority(nodeRule, rules)
        }
      }
    }

    return rules
  }
  static ruleHandlers(rules: Rules): TokenHandlers {
    const handlers = {}

    for (const rule of rules) {
      const type = rule.type
      const rules = handlers[type] || []
      rules.push(rule)

      handlers[type] = rules
      handlers[`${type}_open`] = rules
    }

    return handlers
  }

  parseBlock(source: string, type: ?NodeType = null): Error | Node {
    const root = type || new NodeType("doc", this.schema, { content: "block*" })
    const tokens = this.tokenizer.parse(source, {})
    return this.parseTokens(tokens, root)
  }
  parseInline(source: string): Error | Fragment {
    const root = new NodeType("doc", this.schema, { content: "inline*" })
    const tokens = this.tokenizer.parseInline(source, {})[0].children
    const node = this.parseTokens(tokens, root)
    if (node instanceof Error) {
      return node
    } else {
      return node.content
    }
  }
  parse(source: string) {
    return this.parseBlock(source, this.schema.topNodeType)
  }
  parseTokens(
    tokens: Token[],
    nodeType: NodeType = this.schema.topNodeType
  ): Error | Node {
    try {
      this.top = this

      const error = this.handleTokens(tokens)
      if (error) {
        return error
      }

      this.top.exit()
      const node = nodeType.create(null, this.content.splice(0), this.marks)
      this.top = top
      this.marks = Mark.none

      return node
    } catch (error) {
      this.top = this
      this.marks = Mark.none
      return error
    }
  }
  handleTokens(tokens: Token[]): ?Error {
    for (const token of tokens) {
      const error = this.handleToken(token)
      if (error) {
        return error
      }
    }
  }
  handleOpenToken(token: Token) {
    const { handlers } = this
    const rules = handlers[token.type]
    if (rules) {
      for (const rule of rules) {
        const parser = rule.match(token, this.schema, this.top)
        if (parser != null) {
          this.top = parser.enter()
          return null
        }
      }
    } else {
      return RangeError(`Parser has no rules to match "${token.type}" token`)
    }

    return RangeError(`Parser was unable to match "${token.type}" token`)
  }
  handleCloseToken(token: Token): ?Error {
    this.top = this.top.exit()
  }
  handleAtomicToken(token: Token) {
    const error = this.handleOpenToken(token)
    if (error) {
      return error
    } else {
      this.top.appendText(withoutTrailingNewline(token.content))
      return this.handleCloseToken(token)
    }
  }
  handleToken(token: Token): ?Error {
    switch (token.type) {
      case "text": {
        return void this.top.appendText(token.content)
      }
      case "inline": {
        return this.handleTokens(token.children)
      }
      case "softbreak": {
        return void this.top.appendText("\n")
      }
      default: {
        switch (token.nesting) {
          case OPEN:
            return this.handleOpenToken(token)
          case ATOMIC:
            return this.handleAtomicToken(token)
          case CLOSE:
            return this.handleCloseToken(token)
          default:
            return new Error(
              `Token ${token.type} has invalid nesting ${token.nesting}`
            )
        }
      }
    }
  }
}

const createAttributeTokenDecoder = <a>(
  { attrs, getAttrs }: { attrs?: a, getAttrs?: Token => ?a },
  fallback: Token => ?a
): TokenDecoder<a> => {
  return attrs != null ? always(attrs) : getAttrs != null ? getAttrs : fallback
}
