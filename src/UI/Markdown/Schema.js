// @flow strict

import type { Token } from "markdown-it"
import type { Serializer } from "../Markdown/Serializer"
import * as ProseMirror from "prosemirror-model"
import type { Node, Mark } from "prosemirror-model"

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

export default class Schema extends ProseMirror.Schema {
  markdownSpec: SchemaSpec
  constructor(spec: SchemaSpec) {
    super(spec)
    this.markdownSpec = spec
  }
}
