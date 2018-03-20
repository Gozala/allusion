// @flow strict

import Parser from "../src/UI/Allusion/Parser"
import Serializer from "../src/UI/Allusion/Serializer"
import test from "blue-tape"

test("strong link", async test => {
  const source =
    "__[pica](https://nodeca.github.io/pica/deamo/ )__ - high quality and fast image resize in browser."

  const actual = Parser.parse(source)

  test.deepEqual(actual.toJSON(), {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          {
            type: "anchor",
            attrs: {
              href: "https://nodeca.github.io/pica/deamo/",
              title: null
            },
            content: [
              {
                type: "text",
                marks: [
                  {
                    type: "strong",
                    attrs: {
                      markup: "__"
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
                  markup: "__"
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
  })

  test.equal(
    Serializer.serialize(actual), //?
    source
  )
})
