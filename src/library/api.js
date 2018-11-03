// @noflow strict

/*::
import type { Request, WriteData, Read } from "./lib/library/Main/Request.js"
import type { Response } from "./lib/library/Main/Response.js"
import { BroadcastChannel } from "./lib/DOM/BroadcastChannel.js"
*/

export const saveFileAs = async (
  name /*:string*/,
  content /*:ArrayBuffer*/
) /*:Promise<URL>*/ => {
  const client = await Client.spawn()
  const response = await client.request({
    requestID: "",
    endpoint: "write",
    transfer: [content],
    data: {
      name,
      data: file(content)
    }
  })
  client.kill()

  if (response.endpoint === "write") {
    const { result } = response
    if (result.ok) {
      return new URL(result.value)
    } else {
      throw new Error(`${result.error.message}\n${result.error.stack}`)
    }
  } else {
    throw TypeError(`Got "${response.endpoint}" response for "write" request`)
  }
}

export const saveBundleAs = async (
  name /*:string*/,
  files /*:{[string]:ArrayBuffer}*/
) /*:Promise<URL>*/ => {
  const transfer = []

  for (const path in files) {
    transfer.push(files[path])
  }

  const client = await Client.spawn()
  const response = await client.request({
    requestID: "",
    endpoint: "write",
    transfer,
    data: {
      name,
      data: bundle(files)
    }
  })
  client.kill()

  if (response.endpoint === "write") {
    const { result } = response
    if (result.ok) {
      return new URL(result.value)
    } else {
      throw result.error
    }
  } else {
    throw TypeError(`Got "${response.endpoint}" response for "write" request`)
  }
}

export const pickFile = async (filter /*:string[]*/ = []) /*:Promise<URL>*/ => {
  const client = await Client.spawn()
  const response = await client.request({
    requestID: "",
    endpoint: "read",
    data: { filter },
    transfer: []
  })

  client.kill()

  if (response.endpoint === "read") {
    const { result } = response
    if (result.ok) {
      return new URL(result.value.url)
    } else {
      throw result.error
    }
  } else {
    throw TypeError(`Got "${response.endpoint}" response for "write" request`)
  }
}

class Client {
  static async spawn(
    root /*:HTMLElement*/ = document.documentElement ||
      document.createElement("head")
  ) {
    const document = root.ownerDocument
    const host = document.createElement("iframe")
    const { origin } = document.location
    host.style.display = "none"
    host.src = `//library.hashbase.io/api/host.html?origin=${origin}`
    root.appendChild(host)
    await onload(host)
    return new this(host)
  }
  kill() {
    if (this.host) {
      this.host.ownerDocument.defaultView.removeEventListener("message", this)
      this.host.remove()
    }
    delete this.requests
    delete this.requestID
    delete this.host
  }
  /*::
  +host:HTMLIFrameElement
  +requestID:number
  +requests:{[string]:{resolve(Response):void, reject(mixed):void}}
  */
  constructor(host /*:HTMLIFrameElement*/) {
    this.host = host
    this.host.ownerDocument.defaultView.addEventListener("message", this)
    this.requestID = 0
    this.requests = {}
  }
  handleEvent(event /*:MessageEvent*/) {
    switch (event.type) {
      case "message": {
        return this.handleResponse(event.data)
      }
    }
  }
  handleResponse(data /*:any*/) {
    const response /*:Response*/ = data
    const { id, endpoint, result } = response
    const request = this.requests[id]
    delete this.requests[id]
    if (request) {
      request.resolve(response)
    } else {
      console.warn(`Unexpected response received`, response)
    }
  }
  request(request /*:Request*/) /*:Promise<Response>*/ {
    request.requestID = `${++this.requestID}`
    return new Promise((resolve, reject) => {
      this.requests[request.requestID] = { resolve, reject }
      this.send(request)
    })
  }
  send(request /*:Request*/) {
    this.host.contentWindow.postMessage(
      request,
      this.host.src,
      request.transfer
    )
  }
}

const bundle = (files /*:{[string]:ArrayBuffer}*/) /*:WriteData*/ => ({
  tag: "bundle",
  files
})

export const file = (content /*:ArrayBuffer*/) /*:WriteData*/ => ({
  tag: "file",
  file: content
})

const onload = target =>
  new Promise(succeed => {
    target.onload = succeed
  })
