// @noflow

const parseInline = (self, parent) => {
  let active = [],
    trailing = ""
  let progress = (node, _, index) => {
    let marks = node ? node.marks : []
    let leading = trailing
    trailing = ""
    // If whitespace has to be expelled from the node, adjust
    // leading and trailing accordingly.
    if (
      node &&
      node.isText &&
      marks.some(mark => {
        let info = self.marks[mark.type.name]
        return info && info.expelEnclosingWhitespace
      })
    ) {
      let [_, lead, inner, trail] = /^(\s*)(.*?)(\s*)$/.exec(node.text)
      leading += lead
      trailing = trail
      if (lead || trail) {
        node = inner ? node.withText(inner) : null
        if (!node) marks = active
      }
    }
    let code =
      marks.length &&
      marks[marks.length - 1].type.isCode &&
      marks[marks.length - 1]
    let len = marks.length - (code ? 1 : 0)
    // Try to reorder 'mixable' marks, such as em and strong, which
    // in Markdown may be opened and closed in different order, so
    // that order of the marks for the token matches the order in
    // active.
    outer: for (let i = 0; i < len; i++) {
      let mark = marks[i]
      if (!self.marks[mark.type.name].mixable) break
      for (let j = 0; j < active.length; j++) {
        let other = active[j]
        if (!self.marks[other.type.name].mixable) break
        if (mark.eq(other)) {
          if (i > j)
            marks = marks
              .slice(0, j)
              .concat(mark)
              .concat(marks.slice(j, i))
              .concat(marks.slice(i + 1, len))
          else if (j > i)
            marks = marks
              .slice(0, i)
              .concat(marks.slice(i + 1, j))
              .concat(mark)
              .concat(marks.slice(j, len))
          continue outer
        }
      }
    }
    // Find the prefix of the mark set that didn't change
    let keep = 0
    while (keep < Math.min(active.length, len) && marks[keep].eq(active[keep]))
      ++keep
    // Close the marks that need to be closed
    while (keep < active.length)
      self.text(self.markString(active.pop(), false), false)
    // Output any previously expelled trailing whitespace outside the marks
    if (leading) self.text(leading)
    // Open the marks that need to be opened
    if (node) {
      while (active.length < len) {
        let add = marks[active.length]
        active.push(add)
        self.text(self.markString(add, true), false)
      }
      // Render the node. Special case code marks, since their content
      // may not be escaped.
      if (code && node.isText)
        self.text(
          self.markString(code, false) +
            node.text +
            self.markString(code, true),
          false
        )
      else self.render(node, parent, index)
    }
  }
  parent.forEach(progress)
  progress(null)
}

export default parseInline
