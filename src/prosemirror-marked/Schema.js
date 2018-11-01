// @flow strict

import * as ProseMirror from "../prosemirror-model/src/index.js";

/*::
import type Serializer from "./Serializer.js"
import type { Token } from "../markdown-it/lib/index.js"
import type {
  Node,
  Fragment,
  Mark,
  DOMOutputSpec,
  ParseRule
} from "../prosemirror-model/src/index.js"

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

export type NodeSerializer = (
  SerializerBuffer,
  Node,
  Node | Fragment,
  number
) => SerializerBuffer

export type MarkSerializer = {
  open: string | ((SerializerBuffer, Mark) => string),
  close: string | ((SerializerBuffer, Mark) => string),
  mixable?: boolean,
  ignore?: boolean,
  expelEnclosingWhitespace?: boolean
}

export type SerilizedMark = {
  open: string,
  close: string,
  ignore?: boolean,
  mixable?: boolean,
  expelEnclosingWhitespace?: boolean
}

export interface SerializerBuffer {
  quote(string): string;
  escape(string): string;
  repeat(string, number): string;

  wrapBlock(
    string,
    ?string,
    Node,
    (Node) => SerializerBuffer
  ): SerializerBuffer;
  ensureNewLine(): SerializerBuffer;
  write(content?: string): SerializerBuffer;
  closeBlock(node?: Node): SerializerBuffer;
  text(content?: string, escape?: boolean): SerializerBuffer;
  renderInline(node: Node): SerializerBuffer;
  renderContent(node: Node): SerializerBuffer;
  renderList(
    node: Node,
    delimiter: string,
    firstDelimiter: (Node, number) => string
  ): SerializerBuffer;
}

export type NodeSpec = ProseMirror.NodeSpec & {
  +parseMarkdown?:(AttributeParseRule|NodeParseRule<*>)[],
  +serializeMarkdown: NodeSerializer
}

export type MarkSpec = ProseMirror.MarkSpec & {
  +parseAttributes?: AttributeParseRule[],
  +parseNode?: MarkParseRule<*>[],
  +serializeMarkdown: MarkSerializer
}

export type SchemaSpec = {
  nodes: { [string]: NodeSpec },
  marks?: { [string]: MarkSpec },
  topNode?: string
}
*/

export class Block {
  /*::
  content: string
  group: string
  selectable: boolean
  inline: boolean
  atom: ?boolean
  draggable: boolean
  code: boolean
  defining: boolean
  toDOM: (node: Node) => DOMOutputSpec
  parseDOM: ParseRule[]
  parseMarkdown: (AttributeParseRule | NodeParseRule<*>)[]
  serializeMarkdown: NodeSerializer
  attrs: Object
  static inline:boolean
  static atom:boolean
  static parseMarkdown: (AttributeParseRule | NodeParseRule<*>)[]
  static attrs:Object
  */
  static toDOM(node/* : Node */) {
    return ["div", node.attrs, 0]
  }

  constructor(spec/* : NodeSpec */) {
    this.content = spec.content || ""
    this.group = spec.group || ""
    this.selectable = spec.selectable || true
    this.draggable = spec.draggable || false
    this.defining = spec.defining || false
    this.code = spec.code || false
    this.attrs = spec.attrs || this.constructor.attrs
    this.toDOM = spec.toDOM || this.constructor.toDOM
    this.parseMarkdown = spec.parseMarkdown || this.constructor.parseMarkdown
    this.serializeMarkdown = spec.serializeMarkdown
    this.atom = spec.atom || this.constructor.atom
    this.inline = spec.inline || this.constructor.inline
  }
}
Block.inline = false
Block.atom = false
Block.parseMarkdown = []
Block.attrs = Object.create(null)

export class Inline {
  /*::
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
  serializeMarkdown: NodeSerializer
  attrs: Object
  static inline:boolean
  static atom:boolean
  static parseMarkdown: (AttributeParseRule | NodeParseRule<*>)[]
  static attrs:Object
  */
  static toDOM(node /*: Node*/) {
    return ["span", node.attrs, 0]
  }

  constructor(spec /*: NodeSpec*/) {
    this.content = spec.content || ""
    this.group = spec.group || ""
    this.selectable = spec.selectable || true
    this.draggable = spec.draggable || false
    this.defining = spec.defining || false
    this.atom = spec.atom || this.constructor.atom
    this.inline = spec.inline || this.constructor.inline
    this.attrs = spec.attrs || this.constructor.attrs
    this.toDOM = spec.toDOM || this.constructor.toDOM
    this.parseMarkdown = spec.parseMarkdown || this.constructor.parseMarkdown
    this.serializeMarkdown = spec.serializeMarkdown
  }
}
Inline.inline = true
Inline.atom = false
Inline.parseMarkdown = []
Inline.attrs = Object.create(null)



export class EditBlock extends Block {
  static is(node /*: Node*/) /*: boolean*/ {
    return node.type.spec instanceof EditBlock
  }
}

export class EditNode extends Inline {
  static is(node /* : Node */) /* : boolean */ {
    return node.type.spec instanceof EditNode
  }
}

export class Schema extends ProseMirror.Schema {
  /*::
  markdownSpec: SchemaSpec
  */
  constructor(spec /* : SchemaSpec */) {
    super(spec)
    this.markdownSpec = spec
  }
}
