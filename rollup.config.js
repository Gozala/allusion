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
    format: "iife",
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
      "markdown-it": "markdown-it/dist/markdown-it"
    }),
    babel({
      babelrc: false,
      presets: [flowSyntax]
    }),
    json({ preferConst: true }),
    // legacy({
    //   [flatbuffersPath]: {
    //     flatbuffers: "flatbuffers"
    //   }
    // }),
    resolve({
      module: true,
      jsnext: true,
      main: true,
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
