// @flow

import json from "rollup-plugin-json"
import resolve from "rollup-plugin-node-resolve"
import commonjs from "rollup-plugin-commonjs"
import babel from "rollup-plugin-babel"
import flowSyntax from "babel-preset-flow-syntax"
import legacy from "rollup-plugin-legacy"
import serve from "rollup-plugin-serve"
import postcss from "rollup-plugin-postcss"

// const flatbuffersPath = require.resolve("dominion/node_modules/flatbuffers")

const alias = mapping => ({
  resolveId(importee /*: string */, importer /*: string */) {
    const alias = mapping[importee]
    return alias == null ? null : require.resolve(alias)
  }
})

const bundle = (file, ...plugins) => ({
  input: `./src/${file}.js`,
  output: {
    file: `./js/${file}.js`,
    format: "umd",
    sourcemap: true
  },
  // moduleContext: {
  //   [flatbuffersPath]: "({})"
  // },
  plugins: [
    postcss({
      plugins: []
    }),
    // {
    //   resolveId: function(importee, importer) {
    //     console.log(importee, importer)
    //     if (importee === "markdown-it") {
    //       return require.resolve("markdown-it/dist/markdown-it.js")
    //     }
    //   }
    // },
    alias({
      // "markdown-it": "markdown-it/dist/markdown-it",
      "prosemirror-view": "prosemirror-view/src/index",
      "prosemirror-commands": "prosemirror-commands/src/commands",
      "prosemirror-dropcursor": "prosemirror-dropcursor/src/dropcursor",
      "prosemirror-gapcursor": "prosemirror-gapcursor/src/index",
      "prosemirror-history": "prosemirror-history/src/history",
      "prosemirror-inputrules": "prosemirror-inputrules/src/index",
      "prosemirror-keymap": "prosemirror-keymap/src/keymap",
      "prosemirror-markdown": "prosemirror-markdown/src/index",
      "prosemirror-menu": "prosemirror-menu/src/index",
      "prosemirror-model": "prosemirror-model/src/index",
      "prosemirror-schema-basic": "prosemirror-schema-basic/src/schema-basic",
      "prosemirror-schema-list": "prosemirror-schema-list/src/schema-list",
      "prosemirror-state": "prosemirror-state/src/index",
      "prosemirror-transform": "prosemirror-transform/src/index"
    }),
    json({ preferConst: true }),
    babel({
      babelrc: false,
      presets: [flowSyntax]
    }),
    // legacy({
    //   [flatbuffersPath]: {
    //     flatbuffers: "flatbuffers"
    //   }
    // }),
    resolve({
      module: true,
      jsnext: true,
      main: true,
      preferBuiltins: false,
      browser: true,
      extensions: [".js", ".json"]
    }),
    commonjs()
  ]
})

const watch =
  process.argv.includes("-w") || process.argv.includes("--watch")
    ? [serve()]
    : []

const workers = process.argv.includes("--worker")
  ? process.argv[process.argv.indexOf("--worker") + 1].split(",")
  : []

const embed = process.argv.includes("--embed")
  ? process.argv[process.argv.indexOf("--embed") + 1].split(",")
  : []

export default [...workers.map(bundle), ...embed.map(bundle)]
