// @flow strict

import type { Token } from "markdown-it"
import type Serializer from "./Serializer"
import * as ProseMirror from "prosemirror-model"
import type { Node, Mark, DOMOutputSpec, ParseRule } from "prosemirror-model"

export type AttributeParseRule = {
  type: string,
  tag?: string,
  +priority?: number,

  attrs?: Object,
  getAttrs?: Token => ?Object,
  createMarkup?: void,
  createNode?: void
}

export type MarkParseRule<a> = {
  type: string,
  tag?: string,
  +priority?: number,

  attrs?: a,
  getAttrs: Token => ?a,
  createMarkup: (Schema, a, Mark[]) => [Node[], 0, Node[]],
  createNode?: void
}

export type NodeParseRule<a> = {
  type: string,
  tag?: string,
  +priority?: number,

  attrs?: a,
  getAttrs: Token => ?a,
  createMarkup?: void,
  createNode: (Schema, a, ProseMirror.Node[], Mark[]) => Node
}

export type SerilizedNode = {}

export type SerilizedMark = {
  open: string,
  close: string,
  ignore?: boolean,
  mixable?: boolean,
  expelEnclosingWhitespace?: boolean
}

export type NodeSpec = ProseMirror.NodeSpec & {
  parseMarkdown?: (AttributeParseRule | NodeParseRule<*>)[],
  serializeMarkdown?: (Node, Serializer) => SerilizedNode
}

export type MarkSpec = ProseMirror.MarkSpec & {
  parseMarkdown?: (AttributeParseRule | MarkParseRule<*>)[],
  serializeMarkdown?: Mark => SerilizedMark
}

export type SchemaSpec = {
  nodes: { [string]: NodeSpec },
  marks?: { [string]: MarkSpec },
  topNode?: string
}

export class Block {
  content: string
  group: string
  selectable: boolean
  inline: boolean = false
  atom: boolean = false
  draggable: boolean
  code: boolean
  defining: boolean
  toDOM: (node: Node) => DOMOutputSpec
  parseDOM: ParseRule[]
  parseMarkdown: (AttributeParseRule | NodeParseRule<*>)[]
  attrs: Object

  static parseMarkdown = []
  static toDOM(node: Node) {
    return ["div", node.attrs, 0]
  }

  static attrs = Object.create(null)

  constructor(spec: NodeSpec) {
    this.content = spec.content || ""
    this.group = spec.group || ""
    this.selectable = spec.selectable || true
    this.draggable = spec.draggable || false
    this.defining = spec.defining || false
    this.code = spec.code || false
    this.attrs = spec.attrs || this.constructor.attrs
    this.toDOM = spec.toDOM || this.constructor.toDOM
    this.parseMarkdown = spec.parseMarkdown || this.constructor.parseMarkdown
  }
}

export class Inline {
  content: string
  group: string
  selectable: boolean
  inline: boolean = true
  atom: boolean
  draggable: boolean
  code: boolean
  defining: boolean
  toDOM: (node: Node) => DOMOutputSpec
  parseDOM: ParseRule[]
  parseMarkdown: (AttributeParseRule | NodeParseRule<*>)[]
  attrs: Object

  static toDOM(node: Node) {
    return ["span", node.attrs, 0]
  }
  static parseMarkdown = []

  static attrs = Object.create(null)

  constructor(spec: NodeSpec) {
    this.content = spec.content || ""
    this.group = spec.group || ""
    this.selectable = spec.selectable || true
    this.draggable = spec.draggable || false
    this.defining = spec.defining || false
    this.atom = spec.atom || false
    this.attrs = spec.attrs || this.constructor.attrs
    this.toDOM = spec.toDOM || this.constructor.toDOM
    this.parseMarkdown = spec.parseMarkdown || this.constructor.parseMarkdown
  }
}

export class EditBlock extends Block {
  static is(node: Node): boolean {
    return node.type.spec instanceof EditBlock
  }
}

export class EditNode extends Inline {
  static is(node: Node): boolean {
    return node.type.spec instanceof EditNode
  }
}

export default class Schema extends ProseMirror.Schema {
  markdownSpec: SchemaSpec
  constructor(spec: SchemaSpec) {
    super(spec)
    this.markdownSpec = spec
  }
}
