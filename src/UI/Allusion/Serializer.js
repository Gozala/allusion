// @flow

import Serializer from "../../prosemirror-markedown/Serializer"
import schema from "./Schema"
import header from "./Parser/header"

const unmarkedMarkup = (_, mark) =>
  mark.attrs.marked != null ? "" : mark.attrs.markup

export default new Serializer(
  {
    blockquote(state, node) {
      return state.wrapBlock("> ", null, node, node =>
        state.renderContent(node)
      )
    },
    code_block(buffer, node) {
      return buffer
        .write("```" + node.attrs.params + "\n")
        .text(node.textContent, false)
        .ensureNewLine()
        .write("```")
        .closeBlock(node)
    },
    heading(buffer, node) {
      return buffer.renderInline(node).closeBlock(node)
    },
    horizontal_rule(buffer, node) {
      return buffer.write(node.attrs.markup || "---").closeBlock(node)
    },
    bullet_list(buffer, node) {
      return buffer.renderList(node, "  ", item => `${item.attrs.markup} `)
    },
    ordered_list(buffer, node) {
      const start = node.attrs.order || 1
      const maxW = String(start + node.childCount - 1).length
      const space = buffer.repeat(" ", maxW + 2)
      return buffer.renderList(node, space, (child, i) => {
        const nStr = String(start + i)
        return buffer.repeat(" ", maxW - nStr.length) + nStr + ". "
      })
    },
    list_item(buffer, node) {
      return buffer.renderContent(node)
    },
    checkbox(buffer, node) {
      const status = node.attrs.checked == null ? "[ ]" : "[x]"
      return buffer.write(status).renderContent(node)
    },
    label(buffer, node) {
      return buffer.renderInline(node)
    },
    paragraph(buffer, node) {
      return buffer.renderInline(node).closeBlock(node)
    },

    image(buffer, node) {
      return buffer.write(
        "![" +
          buffer.escape(node.attrs.alt || "") +
          "](" +
          buffer.escape(node.attrs.src) +
          (node.attrs.title ? " " + buffer.quote(node.attrs.title) : " ") +
          ")"
      )
    },
    hard_break(buffer, node, parent, index) {
      for (let i = index + 1; i < parent.childCount; i++) {
        if (parent.child(i).type != node.type) {
          return buffer.write("\\\n")
        }
      }
      return buffer
    },
    text(buffer, node) {
      return buffer.text(node.text, false)
    },
    header(buffer, node) {
      return buffer
        .write("/ ")
        .text(node.textContent, false)
        .closeBlock(node)
    },
    link(buffer, node) {
      if (node.attrs.marked != null) {
        return buffer.renderContent(node)
      } else {
        return buffer
          .write(`[`)
          .renderInline(node)
          .write(`](`)
          .write(buffer.escape(node.attrs.href))
          .write(node.attrs.title ? " " + buffer.quote(node.attrs.title) : " ")
          .write(")")
      }
    },
    expandedHorizontalRule(buffer, node) {
      return buffer.write(node.textContent)
    },
    expandedImage(buffer, node) {
      return buffer.write(node.textContent)
    }
  },
  {
    link: {
      open(state, mark) {
        return `[`
      },
      close(state, mark) {
        const url = state.escape(mark.attrs.href)
        const title = mark.attrs.title ? state.quote(mark.attrs.title) : ""
        return `](${url} ${title})`
      }
    },
    em: {
      open: unmarkedMarkup,
      close: unmarkedMarkup,
      mixable: true
      // expelEnclosingWhitespace: true
    },
    strong: {
      open: unmarkedMarkup,
      close: unmarkedMarkup,
      mixable: true
      // expelEnclosingWhitespace: true
    },
    markup: {
      open: "",
      close: ""
    },
    edit: {
      open: "",
      close: ""
    },
    strike_through: {
      open: unmarkedMarkup,
      close: unmarkedMarkup,
      mixable: true
      // expelEnclosingWhitespace: true
    },
    code: {
      open: "",
      close: "",
      mixable: false
    }
  }
)
