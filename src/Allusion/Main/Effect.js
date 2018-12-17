// @flow strict

import { navigate, load } from "../../Effect/Navigation.js"
import { writeFile } from "../../Effect/dat.js"
import * as library from "../../library/api.js"
import Future from "../../Future/Future.js"
import * as Dat from "../../Effect/dat.js"
import * as Library from "../Library/Effect.js"
import { digest } from "../Notebook/Effect.js"
import MarkdownIt from "../../markdown-it/lib/index.js"
/*::
import type { Document, DocumentUpdate } from "./Data.js"
*/

const toHTML = (title, content) =>
  `<!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf8">
    <title>${title}</title>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="${title}">
    <style>
      :root {
        --hr: rgba(0, 0, 0, 0.05);
        --mono_fonts: 14px/1.5 Menlo, Consolas, monospace;
        --code: menlo, consolas, monaco, monospace;
        --code-font: Consolas, "Lucida Console", Monaco, monospace;
        --code-background: rgb(249, 249, 249);
      }
      
      body {
        text-align: center;
      }
      
      article {
        display: inline-block;
        text-align: left;
        max-width: 34em;
        font-size: 1.25rem;
        font-family: -apple-system,BlinkMacSystemFont,avenir next,avenir,helvetica neue,helvetica,ubuntu,roboto,noto,segoe ui,arial,sans-serif;
        -webkit-font-smoothing: antialiased;
      }
      
      a {
        color: rgb(68, 132, 194);
      }
      
      code {
        background-color: var(--code-background);
        border-radius: 2px;
        outline: none;
        white-space: pre !important;
        font-family: var(--code-font);
        margin: 0 0.2rem;
        padding: 0 0.2rem;
      }
      
      blockquote {
        padding-left: 1em;
        border-left: 3px solid #eee;
        margin-left: 0;
        margin-right: 0;
      }
      
      pre {
        font-family: var(--code-font);
      }
    </style>
  </head>
  <body class="sans-serif bg-white">
    <article>${new MarkdownIt().render(content)}</article>
  </body>
</html>
`

export const publish = (content /*:string*/, name /*:string*/) =>
  new Future(async () /*:Promise<URL>*/ => {
    const encoder = new TextEncoder()
    const markdown = encoder.encode(content)
    const html = encoder.encode(toHTML(name, content))

    return await library.saveBundleAs(name, {
      "index.html": html.buffer,
      "post.md": markdown.buffer
    })
  })

export const saveChanges = ({ before, after } /*:DocumentUpdate*/) =>
  new Future(async () /*:Promise<URL>*/ => {
    const storeURL = await Library.requestSiteStore()
    const url = new URL(`/${after.title}.md`, storeURL)
    if (before != null && before.title !== after.title) {
      const oldURL = new URL(`/${before.title}.md`, storeURL)
      if (before.article === after.article && before.author && after.author) {
        await Dat.move(oldURL, url)
      } else {
        await Dat.writeFile(url, after.markup)
        await Dat.removeFile(oldURL)
      }
    } else if (before == null || before.markup !== after.markup) {
      await Dat.writeFile(url, after.markup)
    }
    return url
  })

/*::
type ListOptions = {
  +limit:number;
}
*/

export { navigate, load }
