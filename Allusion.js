// @flow strict

import { spawn } from "./src/reflex/Application.js"
import * as Main from "./src/Allusion/Main.js"

if (location.protocol === "dat:") {
  window.main = spawn(Main, window.main, window.document)
}
