;(async () => {
  class HotSwap extends HTMLElement {
    static insert(target) {
      const document = target.ownerDocument
      const window = document.defaultView
      window.customElements.define("hot-swap", this)
      return target.appendChild(document.createElement("hot-swap"))
    }
    constructor(...args) {
      super(...args)
      this.init()
    }
    init() {
      this.root = this.attachShadow({ mode: "open" })
    }
    connectedCallback() {
      this.root.innerHTML = `
      <style>
      .notification {
        line-height: 1.15; /* 1 */
        -webkit-text-size-adjust: 100%;
    
        pointer-events: none;
        position: absolute;
        display: inline-block;
        z-index: 1000;
        top: 0px;
        right: 0px;
        background-image: none;
        background-color: transparent;
        border: none;
        margin: 10px;
        padding: 0;
    
    
        font-family: -apple-system, BlinkMacSystemFont,
                   'avenir next', avenir,
                   helvetica, 'helvetica neue',
                   ubuntu,
                   roboto, noto,
                   'segoe ui', arial,
                   sans-serif;
        max-width: 400px;
      }
    
      .notification form .version {
          margin-right: 20px;
      }
    
      .notification .status {
        position: absolute;
        width: 100%;
        height: 100%;
        left: 0;
        top: 0;
        pointer-events: none;
        display: block;
        text-indent: -9999px;
      }
    
      .notification .status:after {
        content: "";
        background-color: white;
        display: inline-block;
        border-radius: 100%;
        border: 2px solid rgba(255, 255, 255, 0.2);
        width: 0.8rem;
        height: 0.8rem;
        transition: 0.3s;
        position: absolute;
        right: 3px;
        top: 3px;
      }
    
      .update input:checked + form:not(:hover) .status:after {
        background: transparent;
        border-left: 2px solid #ffffff;
        animation: spin 0.8s infinite linear;
      }
      
      .notification input:not(:checked) + form .status:after {
        right: calc(100% - 3px);
        transform: translateX(100%);
      }
    
      .notification input:checked + form .status:after {
        right: 3px;
      }
    
      .notification input:checked + form .version {
        opacity: 1;
      }
    
      .notification input + form .version {
        opacity: 0;
        transition: 0.3s;
      }
    
      .notification input[type=checkbox] {
        position: absolute;
        opacity: 0;
        display: block;
        cursor: pointer;
        width: 100%;
        height: 100%;
        pointer-events: all;
        z-index: 10;
      }
    
    
    
      
      .notification.update {
        animation: upgrade 1.2s infinite ease-in-out;
      }
    
      .notification.hide > form {
        transform: scale(0);
      }

      .notification:hover > form {
        transform: scale(1);
      }
    
      .notification > form {
        transform: scale(1);
      }
    
    
      
      .notification form {
        color: white;
        pointer-events: all;
        min-width: 1px;
        box-sizing: border-box;
        display: inline-block;
    
        border-radius: 3em;
        box-shadow: 0 0 18px rgba(100, 100, 100, 0.5);
    
    
        margin: 0 auto;
        transition: 0.4s cubic-bezier(.86,0,.07,1) padding,
                    0.3s cubic-bezier(.68,-0.55,.27,1.55) transform,
                    0.2s ease background-color,
                    0.2s ease opacity;
      }
    
      .notification input:checked + form {
        background: rgb(83, 64, 242);
        opacity: 1;
      }
    
      .notification form {
        background: #444249;
        opacity: 0.5;
      }
    
    
      .notification > form > label {
        box-sizing: border-box;
      }
    
      .notification > form:hover,
      .active.notification > form {
      }
      
    
      .notification > form > .version:after {
        content: "";
      }
    
      .notification > form > label {
        display: inline-block;
    
        transform: scale(1);
        font-size: 22px;
        font-size: 0.6rem;
        text-align: right;
        line-height: 1.15;
        padding: 0.3rem;
        cursor: pointer;
        transition: 0.6s ease transform;
      }
    
    
      @keyframes spin {
        0% {
          -webkit-transform: rotate(0deg);
          transform: rotate(0deg);
        }
        100% {
          -webkit-transform: rotate(360deg);
          transform: rotate(360deg);
        }
      }
      </style>
      <aside class="notification hide">
      <input id="hotswap" type="checkbox" checked />
      <form>
        <label class="version" for="hotswap">1649</label>
        <label class="status">&nbsp;</label>
      </form>
    </aside>`
    }
    set visible(value) {
      const classList = this.root.querySelector("aside").classList
      if (value) {
        classList.remove("hide")
      } else {
        classList.add("hide")
      }
    }
    set version(version) {
      const label = this.root.querySelector(".version")
      label.textContent = version
    }
    set idle(value) {
      const classList = this.root.querySelector("aside").classList
      if (value) {
        classList.remove("update")
      } else {
        classList.add("update")
      }
    }
    get enabled() {
      return this.root.querySelector("input").value === "on"
    }
  }

  const wait = event => {
    const script = event.target
    const { resolve, reject, url } = script
    script.onerror = null
    script.onload = null
    script.resolve = null
    script.reject = null
    script.src = null
    script.remove()
    switch (event.type) {
      case "load":
        return resolve(url)
      case "error":
        return reject(new Error(`Failed to import: ${url}`))
    }
  }

  const upgrade = version =>
    Promise.all(scripts.map(script => upgradeTo(script, version)))

  const upgradeTo = (script, version) =>
    new Promise((resolve, reject) => {
      const { pathname } = new URL(script.src, baseURI)
      const url = `dat://${location.host}+${version}${pathname}`
      script.setAttribute("version", version)
      const newScript = document.createElement("script")
      newScript.type = "module"
      newScript.defer = true
      newScript.async = true
      newScript.dataset.liveReload = true
      newScript.src = url
      newScript.resolve = resolve
      newScript.reject = reject
      newScript.onerror = wait
      newScript.onload = wait
      document.head.appendChild(newScript)
    })

  // Capture baseURI as we want to ignore changes triggered by pushState.
  const baseURI = document.baseURI
  const query = "script[type=module][data-live-reload]"
  const scripts = [...document.querySelectorAll(query)]

  if (location.protocol === "dat:") {
    const archive = await DatArchive.load(`dat://${location.host}`)
    const { isOwner, version } = await archive.getInfo()

    if (isOwner) {
      const view = HotSwap.insert(document.documentElement)
      view.visible = true
      view.idle = true
      view.version = version

      if (scripts.length > 0) {
        const watcher = archive.watch(["*.js", "**/*.js"])
        watcher.addEventListener("changed", async ({ path }) => {
          view.idle = false

          const { version } = await archive.getInfo()
          view.version = version

          if (view.enabled) {
            view.visible = true
            await upgrade(version)
            view.idle = true
            view.visible = false
          }
        })

        view.visible = false
      } else {
        view.visible = false
      }
    }
  }
})()
