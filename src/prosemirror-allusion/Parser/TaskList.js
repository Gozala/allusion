// @noflow
var disableCheckboxes = true
var useLabelWrapper = false
var useLabelAfter = false

let nextID = 0

export default function(md, options) {
  if (options) {
    disableCheckboxes = !options.enabled
    useLabelWrapper = !!options.label
    useLabelAfter = !!options.labelAfter
  }

  md.core.ruler.after("inline", "github-task-lists", function(state) {
    var tokens = state.tokens
    for (var i = 2; i < tokens.length; i++) {
      if (isTodoItem(tokens, i)) {
        todoify(tokens[i], state.Token)
        attrSet(
          tokens[i - 2],
          "class",
          "task-list-item" + (!disableCheckboxes ? " enabled" : "")
        )
        attrSet(
          tokens[parentToken(tokens, i - 2)],
          "class",
          "contains-task-list"
        )
      }
    }
  })
}

function attrSet(token, name, value) {
  var index = token.attrIndex(name)
  var attr = [name, value]

  if (index < 0) {
    token.attrPush(attr)
  } else {
    token.attrs[index] = attr
  }
}

function parentToken(tokens, index) {
  var targetLevel = tokens[index].level - 1
  for (var i = index - 1; i >= 0; i--) {
    if (tokens[i].level === targetLevel) {
      return i
    }
  }
  return -1
}

function isTodoItem(tokens, index) {
  return (
    isInline(tokens[index]) &&
    isParagraph(tokens[index - 1]) &&
    isListItem(tokens[index - 2]) &&
    startsWithTodoMarkdown(tokens[index])
  )
}

function todoify(token, TokenConstructor) {
  const checked = token.content.indexOf("[ ] ") !== 0
  token.children[0].content = token.children[0].content.slice(3)
  token.content = token.content.slice(3)

  if (useLabelWrapper) {
    if (useLabelAfter) {
      // Use large random number as id property of the checkbox.
      var id = "task-item-" + Math.ceil(Math.random() * (10000 * 1000) - 1000)
      token.children.unshift(beginLabel(TokenConstructor, id))
      token.children.push(endLabel(TokenConstructor))
      token.children.unshift(makeCheckbox(token, checked, TokenConstructor, id))
    } else {
      token.children.unshift(makeCheckbox(token, checked, TokenConstructor))
      token.children.unshift(beginLabel(TokenConstructor))
      token.children[0].content = token.content
      token.children.push(endLabel(TokenConstructor))
    }
  }
}

function makeCheckbox(token, checked, TokenConstructor, id) {
  var checkbox = new TokenConstructor("checkbox_input", "input", 0)
  // TODO: Figure out a better way to generate ID.
  checkbox.attrs = [["type", "checkbox"], ["id", id]]

  if (disableCheckboxes) {
    checkbox.attrs.push(["disabled", ""])
  }

  if (checked) {
    checkbox.attrs.push(["checked", ""])
  }

  return checkbox
}

// these next two functions are kind of hacky; probably should really be a
// true block-level token with .tag=='label'
function beginLabel(TokenConstructor, id) {
  const label = new TokenConstructor("label_open", "label", 0)
  label.attrs = [["for", id]]
  return label
}

function endLabel(TokenConstructor) {
  return new TokenConstructor("label_close", "label", 0)
}

function isInline(token) {
  return token.type === "inline"
}
function isParagraph(token) {
  return token.type === "paragraph_open"
}
function isListItem(token) {
  return token.type === "list_item_open"
}

function startsWithTodoMarkdown(token) {
  // leading whitespace in a list item is already trimmed off by markdown-it
  return (
    token.content.indexOf("[ ] ") === 0 ||
    token.content.indexOf("[x] ") === 0 ||
    token.content.indexOf("[X] ") === 0
  )
}
