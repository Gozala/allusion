// @flow

import Serializer from "../../prosemirror-markedown/Serializer"
import schema from "./Schema"
import header from "./Parser/header"

const unmarkedMarkup = (_, mark) =>
  mark.attrs.marked != null ? "" : mark.attrs.markup

export default new Serializer(
  {
    blockquote(state, node) {
      state.wrapBlock("> ", null, node, () => state.renderContent(node))
    },
    code_block(state, node) {
      state.write("```" + node.attrs.params + "\n")
      state.text(node.textContent, false)
      state.ensureNewLine()
      state.write("```")
      state.closeBlock(node)
    },
    heading(state, node) {
      if (!node.attrs.marked != null) {
        state.write(state.repeat("#", node.attrs.level) + " ")
      }
      state.renderInline(node)
      state.closeBlock(node)
    },
    horizontal_rule(state, node) {
      state.write(node.attrs.markup || "---")
      state.closeBlock(node)
    },
    bullet_list(state, node) {
      state.renderList(node, "  ", item => `${item.attrs.markup} `)
    },
    ordered_list(state, node) {
      let start = node.attrs.order || 1
      let maxW = String(start + node.childCount - 1).length
      let space = state.repeat(" ", maxW + 2)
      state.renderList(node, space, (child, i) => {
        let nStr = String(start + i)
        return state.repeat(" ", maxW - nStr.length) + nStr + ". "
      })
    },
    list_item(state, node) {
      state.renderContent(node)
    },
    checkbox(state, node) {
      if (node.attrs.checked == null) {
        state.write("[ ]")
      } else {
        state.write("[x]")
      }
      state.renderContent(node)
    },
    label(state, node) {
      state.renderInline(node)
    },
    paragraph(state, node) {
      state.renderInline(node)
      state.closeBlock(node)
    },

    image(state, node) {
      state.write(
        "![" +
          state.esc(node.attrs.alt || "") +
          "](" +
          state.esc(node.attrs.src) +
          (node.attrs.title ? " " + state.quote(node.attrs.title) : " ") +
          ")"
      )
    },
    hard_break(state, node, parent, index) {
      for (let i = index + 1; i < parent.childCount; i++)
        if (parent.child(i).type != node.type) {
          state.write("\\\n")
          return
        }
    },
    text(state, node) {
      state.text(node.text, false)
    },
    Markup(state, node) {},
    header(state, node) {
      state.write("/ ")
      state.text(node.textContent, false)
      state.closeBlock(node)
    },
    link(state, node) {
      if (node.attrs.marked != null) {
        state.renderContent(node)
      } else {
        state.write(`[`)
        state.renderInline(node)
        state.write(`](`)
        state.write(state.esc(node.attrs.href))
        state.write(
          node.attrs.title ? " " + state.quote(node.attrs.title) : " "
        )
        state.write(")")
      }
    },
    expandedHorizontalRule(state, node) {
      state.write(node.textContent)
    },
    expandedImage(state, node) {
      state.write(node.textContent)
    }
  },
  {
    link: {
      open(state, mark) {
        return `[`
      },
      close(state, mark) {
        const url = state.esc(mark.attrs.href)
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
