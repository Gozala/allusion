// @flow strict

import * as Decoder from "../../Decoder.flow/Decoder.js"

export const save = Decoder.ok({
  message: {
    tag: "save",
    value: true
  }
})
