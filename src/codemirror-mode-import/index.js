// @flow strict

/*::
import type { Editor } from "../codemirror/src/codemirror.js"
*/

const resolveURL = (url/*:string*/) => {
  const a = document.createElement("a")
  a.setAttribute("href", url)    // <a href="hoge.html">
  return a.cloneNode(false).href // -> "http://example.com/hoge.html"
}

const head = document.head || document.appendChild(document.createElement("head"))

export const importModule = /*::<a>*/(url/*:string*/)/*:Promise<a>*/ => {
  return new Promise((resolve, reject) => {
    const id = "$import$" + Math.random().toString(32).slice(2)
    const script = document.createElement("script")
    script.defer = true
    script.type = "module"
    script.id = id
    const destructor = () => {
      delete window[id]
      script.onerror = null
      script.onload = null
      script.remove()
      URL.revokeObjectURL(script.src)
      script.src = ""
    }
    script.onerror = () => {
      reject(new Error(`Failed to import: ${url}`))
      destructor()
    }
    script.onload = () => {
      resolve(window[id])
      destructor()
    }
    const loader = `import * as m from "${resolveURL(url)}"; window.${id} = m;`;
    const blob = new Blob([loader], { type: "text/javascript" });
    script.src = URL.createObjectURL(blob)

    head.appendChild(script)
  });
}

export default function(CodeMirror/*:any*/, modeURL/*:string*/ = "../mode/%N/%N.js") {
  const pending = {}

  const dependencies = function *(name) {
    const { dependencies } = CodeMirror.modes[name]
    if (dependencies) {
      for (const dependency of dependencies) {
        if (!CodeMirror.modes.hasOwnProperty(dependency)) {
          yield dependency
        }
      }
    }
  }

  const importMode = async (mode/*:string|{name:string}*/) => {
    const name = typeof mode === "string" ? mode : mode.name;
    if (pending[name]) {
      return pending[name]
    } else if (CodeMirror.modes.hasOwnProperty(name)) {
      return CodeMirror.modes[name]
    } else {
      const pendingMode = loadMode(name)
      pending[name] = pendingMode
      return pendingMode
    }
  }

  const loadMode = async(name) => {
    const url = modeURL.replace(/%N/g, name);

    const defineMode = await importModule(url)
    defineMode.default(CodeMirror)
    for (const dependency of dependencies(name)) {
      await loadMode(name)
    }
    delete pending[name]
    return CodeMirror.modes[name]
  }

  const setMode = async (instance/*:Editor*/, mode/*:string|{name:string}*/) => {
    instance.setOption("mode", mode)
    if (!CodeMirror.modes[mode]) {
      await importMode(mode)
      instance.setOption("mode", instance.getOption("mode"))
    }
  }

  return setMode
}
