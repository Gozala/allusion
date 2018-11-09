// @flow strict

import { spawn } from "./reflex/Application.js"
import * as Main from "./Allusion/Main.js"

if (location.protocol === "dat:") {
  debugger
  window.main = spawn(Main, window.main, window.document)
}
