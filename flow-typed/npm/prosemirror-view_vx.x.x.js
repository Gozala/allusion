// flow-typed signature: bde573072487015b0a0e976e9bd6aec7
// flow-typed version: <<STUB>>/prosemirror-view_v1.1.1/flow_v0.66.0

/**
 * This is an autogenerated libdef stub for:
 *
 *   'prosemirror-view'
 *
 * Fill this stub out by replacing all the `any` types.
 *
 * Once filled out, we encourage you to share your work with the
 * community by sending a pull request to:
 * https://github.com/flowtype/flow-typed
 */

declare module "prosemirror-view" {
  import type {
    Slice,
    Node,
    ResolvedPos,
    DOMSerializer,
    DOMParser
  } from "prosemirror-model"
  import type { EditorState, Transaction } from "prosemirror-state"
  import type { Mapping } from "prosemirror-transform"

  declare export class EditorView {
    dom: Element;
    dragging: ?{ slice: Slice, move: boolean };
    props: DirectEditorProps;
    root: Document | DocumentFragment;
    state: EditorState;

    constructor(
      place: Element | (Element => void | { mount: Element }),
      DirectEditorProps
    ): void;

    update(DirectEditorProps): void;
    setProps(DirectEditorProps): void;
    updateState(EditorState): void;
    someProp<a>(propName: string): a;
    someProp<a, b>(propName: string, (a) => b): b;
    hasFocus(): boolean;
    focus(): void;
    posAtCoords(coords: { left: number, top: number }): ?{
      pos: number,
      inside: number
    };
    coordsAtPos(
      pos: number
    ): { left: number, right: number, top: number, bottom: number };
    domAtPos(pos: number): { node: Element, offset: number };
    endOfTextblock(dir: Direction, state?: EditorState): boolean;
    destroy(): void;
    dispatch(tr: Transaction): void;
  }

  declare export type EditorProps = {
    handleDOMEvents?: { [string]: (EditorView, Event) => boolean },
    handleKeyDown?: (EditorView, KeyboardEvent) => boolean,
    handleKeyPress?: (EditorView, KeyboardEvent) => boolean,
    handleTextInput?: (
      EditorView,
      from: number,
      to: number,
      text: string
    ) => boolean,
    handleClickOn?: (
      EditorView,
      pos: number,
      node: Node,
      nodePos: number,
      MouseEvent,
      direct: boolean
    ) => boolean,
    handleClick?: (EditorView, pos: number, MouseEvent) => boolean,
    handleDoubleClickOn?: (
      view: EditorView,
      pos: number,
      node: Node,
      nodePos: number,
      event: MouseEvent,
      direct: boolean
    ) => boolean,
    handleDoubleClick?: (
      view: EditorView,
      pos: number,
      event: MouseEvent
    ) => boolean,

    handleTripleClick?: (
      view: EditorView,
      pos: number,
      event: MouseEvent
    ) => boolean,
    handleTripleClickOn?: (
      EditorView,
      pos: number,
      node: Node,
      nodePos: number,
      event: MouseEvent,
      direct: boolean
    ) => boolean,
    handlePaste?: (view: EditorView, event: Event, slice: Slice) => boolean,
    handleDrop?: (
      view: EditorView,
      event: Event,
      slice: Slice,
      moved: boolean
    ) => boolean,
    handleScrollToSelection?: (view: EditorView) => boolean,
    createSelectionBetween?: (
      EditorView,
      ResolvedPos,
      ResolvedPos
    ) => ?Selection,
    domParser?: DOMParser,
    transformPastedHTML?: (html: string) => string,
    clipboardParser?: DOMParser,
    transformPastedText?: (text: string) => string,
    clipboardTextParser?: (text: string, $context: ResolvedPos) => Slice,
    transformPasted?: Slice => Slice,

    nodeViews?: {
      [string]: (
        Node,
        EditorView,
        getPos: () => number,
        decorations: Decoration<DecorationSet>[]
      ) => NodeView
    },
    clipboardSerializer?: DOMSerializer,
    decorations?: (state: EditorState) => ?DecorationSet,
    editable?: (state: EditorState) => boolean,
    attributes?: { [string]: string } | (EditorState => { [string]: string }),
    scrollThreshold?: number,
    scrollMargin?: number
  }

  declare export type DirectEditorProps = EditorProps & {
    state: EditorState,

    dispatchTransaction?: (tr: Transaction) => void
  }

  declare export interface NodeView {
    dom?: Element;
    contentDOM?: Element;

    +update?: (
      node: Node,
      decorations: Decoration<DecorationSpec>[]
    ) => boolean;
    +selectNode?: () => void;
    +deselectNode?: () => void;

    +setSelection?: (anchor: number, head: number, root: Document) => void;
    +stopEvent?: (event: Event) => boolean;
    +ignoreMutation?: MutationRecord => boolean;

    +destroy?: () => void;
  }

  declare export class Decoration<spec: DecorationSpec> {
    from: number;
    to: number;
    spec: spec;

    static widget<spec: WidgetDecorationSpec>(
      pos: number,
      dom: Node,
      ?spec
    ): Decoration<spec>;
    static inline<spec: InlineDecorationSpec>(
      from: number,
      to: number,
      attrs: DecorationAttrs,
      ?spec
    ): Decoration<spec>;
    static node<spec: NodeDecorationSpec>(
      from: number,
      to: number,
      attrs: DecorationAttrs,
      ?spec
    ): Decoration<spec>;
  }

  declare export interface DecorationAttrs {
    class?: string;
    style?: string;
    nodeName?: string;
  }

  declare export class DecorationSet {
    find(
      start?: number,
      end?: number,
      predicate?: (spec: Object) => boolean
    ): Decoration<DecorationSpec>[];

    map(
      mapping: Mapping,
      doc: Node,
      options?: { onRemove?: DecorationSpec => void }
    ): DecorationSet;
    add(doc: Node, decorations: Decoration<DecorationSpec>[]): DecorationSet;
    remove(decorations: Decoration<DecorationSpec>[]): DecorationSet;

    static create(
      doc: Node,
      decorations: Decoration<DecorationSpec>[]
    ): DecorationSet;
    static empty: DecorationSet;
  }

  declare export interface DecorationSpec {}

  declare export interface WidgetDecorationSpec extends DecorationSpec {
    key?: string;
    side?: number;
    stopEvent?: (event: Event) => boolean;
  }

  declare export interface InlineDecorationSpec extends DecorationSpec {
    inclusiveStart?: boolean;
    inclusiveEnd?: boolean;
  }

  declare export interface NodeDecorationSpec extends DecorationSpec {}

  declare export type Direction =
    | "up"
    | "down"
    | "left"
    | "right"
    | "forward"
    | "backward"
}
