// @flow strict

import Program from "./Program"
import * as Allusion from "./Allusion"

self.main = Program.spawn(Allusion, {
  node: document.body || document.createElement("body"),
  options: undefined
})
