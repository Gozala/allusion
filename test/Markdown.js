// @flow strict

import Parser from "../src/UI/Allusion/Parser"
import Serializer from "../src/UI/Allusion/Serializer"
import { expandRange } from "../src/UI/ProseMirror/Expand"
import { collapseRange } from "../src/UI/ProseMirror/Collapse"
import ChangeList from "../src/UI/ProseMirror/ChangeList"
import { EditorState, Selection, TextSelection } from "prosemirror-state"
import test from "blue-tape"
import { assign } from "markdown-it/lib/common/utils"

test("strong link", async test => {
  const source =
    "__[pica](https://nodeca.github.io/pica/deamo/ )__ - high quality and fast image resize in browser."

  const actual = Parser.parse(source)
  if (actual instanceof Error) {
    throw actual
  }

  test.deepEqual(
    actual.toJSON(),
    {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "link",
              attrs: {
                href: "https://nodeca.github.io/pica/deamo/",
                title: null,
                marked: null
              },
              content: [
                {
                  type: "text",
                  marks: [
                    {
                      type: "strong",
                      attrs: {
                        markup: "__",
                        marked: null
                      }
                    }
                  ],
                  text: "pica"
                }
              ],
              marks: [
                {
                  type: "strong",
                  attrs: {
                    markup: "__",
                    marked: null
                  }
                }
              ]
            },
            {
              type: "text",
              text: " - high quality and fast image resize in browser."
            }
          ]
        }
      ]
    },
    "correctly parse markdown"
  )

  test.equal(
    Serializer.serialize(actual),
    source,
    "serialize parsed markdown document back to source"
  )
})

test("expand strong link", async test => {
  const source = `Paragraph with **[strong link](#bold)** in it.`
  const doc = Parser.parse(source)
  if (doc instanceof Error) {
    throw doc
  }

  test.deepEqual(
    doc.toJSON(),
    {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Paragraph with " },
            {
              type: "link",
              attrs: { href: "#bold", title: null, marked: null },
              content: [
                {
                  type: "text",
                  marks: [
                    { type: "strong", attrs: { markup: "**", marked: null } }
                  ],
                  text: "strong link"
                }
              ],
              marks: [{ type: "strong", attrs: { markup: "**", marked: null } }]
            },
            { type: "text", text: " in it." }
          ]
        }
      ]
    },
    "correctly parse doc"
  )

  test.equal(
    Serializer.serialize(doc),
    `Paragraph with **[strong link](#bold )** in it.`,
    "serialize to almost identical (extra space needs fixing) document"
  )

  const state = EditorState.create({ doc })

  const tr = expandRange(state.tr, {
    index: 0,
    length: state.doc.content.size
  })

  test.deepEqual(
    tr.doc.toJSON(),
    {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Paragraph with "
            },
            {
              type: "link",
              attrs: {
                href: "#bold",
                title: null,
                marked: ""
              },
              content: [
                {
                  type: "text",
                  marks: [
                    {
                      type: "markup",
                      attrs: {
                        class: "markup",
                        code: "",
                        marked: "",
                        markup: "**"
                      }
                    },
                    {
                      type: "strong",
                      attrs: {
                        markup: "**",
                        marked: ""
                      }
                    }
                  ],
                  text: "**"
                },
                {
                  type: "text",
                  marks: [
                    {
                      type: "markup",
                      attrs: {
                        class: "markup",
                        code: "",
                        marked: "",
                        markup: ""
                      }
                    },
                    {
                      type: "strong",
                      attrs: {
                        markup: "**",
                        marked: null
                      }
                    }
                  ],
                  text: "["
                },
                {
                  type: "text",
                  marks: [
                    {
                      type: "strong",
                      attrs: {
                        markup: "**",
                        marked: ""
                      }
                    }
                  ],
                  text: "strong link"
                },
                {
                  type: "text",
                  marks: [
                    {
                      type: "markup",
                      attrs: {
                        class: "markup",
                        code: "",
                        marked: "",
                        markup: ""
                      }
                    },
                    {
                      type: "strong",
                      attrs: {
                        markup: "**",
                        marked: null
                      }
                    }
                  ],
                  text: "]("
                },
                {
                  type: "text",
                  marks: [
                    {
                      type: "markup",
                      attrs: {
                        class: "markup",
                        code: null,
                        marked: "",
                        markup: ""
                      }
                    },
                    {
                      type: "strong",
                      attrs: {
                        markup: "**",
                        marked: null
                      }
                    }
                  ],
                  text: "#bold "
                },
                {
                  type: "text",
                  marks: [
                    {
                      type: "markup",
                      attrs: {
                        class: "markup",
                        code: "",
                        marked: "",
                        markup: ""
                      }
                    },
                    {
                      type: "strong",
                      attrs: {
                        markup: "**",
                        marked: null
                      }
                    }
                  ],
                  text: ")"
                },
                {
                  type: "text",
                  marks: [
                    {
                      type: "markup",
                      attrs: {
                        class: "markup",
                        code: "",
                        marked: "",
                        markup: "**"
                      }
                    }
                  ],
                  text: "**"
                }
              ],
              marks: [
                {
                  type: "strong",
                  attrs: {
                    markup: "**",
                    marked: ""
                  }
                }
              ]
            },
            {
              type: "text",
              text: " in it."
            }
          ]
        }
      ]
    },
    "correctly expands paragaraph"
  )

  test.equal(
    Serializer.serialize(tr.doc),
    `Paragraph with **[strong link](#bold )** in it.`,
    "correctly serialize expanded document"
  )

  const tr2 = collapseRange(tr, { index: 0, length: tr.doc.content.size })

  test.equal(doc.eq(tr2.doc), true, "collapse to the same doc")
})

test("expand inner strong link", async test => {
  const source = `Paragraph with inner [**strong link**](#bold) in it.`
  const doc = Parser.parse(source)
  if (doc instanceof Error) {
    throw doc
  }

  test.deepEqual(
    doc.toJSON(),
    {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Paragraph with inner " },
            {
              type: "link",
              attrs: { href: "#bold", title: null, marked: null },
              content: [
                {
                  type: "text",
                  marks: [
                    { type: "strong", attrs: { markup: "**", marked: null } }
                  ],
                  text: "strong link"
                }
              ]
            },
            { type: "text", text: " in it." }
          ]
        }
      ]
    },
    "correctly parse doc"
  )

  test.equal(
    Serializer.serialize(doc),
    `Paragraph with inner [**strong link**](#bold ) in it.`,
    "serialize to almost identical (extra space needs fixing) document"
  )

  const state = EditorState.create({ doc })
  const tr = expandRange(state.tr, {
    index: 0,
    length: state.doc.content.size
  })

  test.deepEqual(
    tr.doc.toJSON(),
    {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Paragraph with inner "
            },
            {
              type: "link",
              attrs: {
                href: "#bold",
                title: null,
                marked: ""
              },
              content: [
                {
                  type: "text",
                  marks: [
                    {
                      type: "markup",
                      attrs: {
                        class: "markup",
                        code: "",
                        marked: "",
                        markup: ""
                      }
                    }
                  ],
                  text: "["
                },
                {
                  type: "text",
                  marks: [
                    {
                      type: "markup",
                      attrs: {
                        class: "markup",
                        code: "",
                        marked: "",
                        markup: "**"
                      }
                    },
                    {
                      type: "strong",
                      attrs: {
                        markup: "**",
                        marked: ""
                      }
                    }
                  ],
                  text: "**"
                },
                {
                  type: "text",
                  marks: [
                    {
                      type: "strong",
                      attrs: {
                        markup: "**",
                        marked: ""
                      }
                    }
                  ],
                  text: "strong link"
                },
                {
                  type: "text",
                  marks: [
                    {
                      type: "markup",
                      attrs: {
                        class: "markup",
                        code: "",
                        marked: "",
                        markup: "**"
                      }
                    }
                  ],
                  text: "**"
                },
                {
                  type: "text",
                  marks: [
                    {
                      type: "markup",
                      attrs: {
                        class: "markup",
                        code: "",
                        marked: "",
                        markup: ""
                      }
                    }
                  ],
                  text: "]("
                },
                {
                  type: "text",
                  marks: [
                    {
                      type: "markup",
                      attrs: {
                        class: "markup",
                        code: null,
                        marked: "",
                        markup: ""
                      }
                    }
                  ],
                  text: "#bold "
                },
                {
                  type: "text",
                  marks: [
                    {
                      type: "markup",
                      attrs: {
                        class: "markup",
                        code: "",
                        marked: "",
                        markup: ""
                      }
                    }
                  ],
                  text: ")"
                }
              ]
            },
            {
              type: "text",
              text: " in it."
            }
          ]
        }
      ]
    },
    "expands as expected"
  )

  test.equal(
    Serializer.serialize(tr.doc),
    "Paragraph with inner [**strong link**](#bold ) in it.",
    "correctly serialize expanded document"
  )

  const tr2 = collapseRange(tr, { index: 0, length: tr.doc.content.size })

  test.equal(doc.eq(tr2.doc), true, "collapse to the same doc")
})
