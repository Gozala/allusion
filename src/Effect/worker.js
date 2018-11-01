// @flow status

import { never } from "../reflex/Basics.js"
import { future } from "../reflex/Future.js"

class Service {
  static spawn(url /*:URL*/) /*:Service*/ {
    const self = Worker[`@${url.href}`]
    if (self == null) {
      const worker = new Worker(url.href)
      const self = new Service(url, worker, 0)
      Worker[`@${url.href}`] = self
      return self
    } else {
      return self
    }
  }
  /*::
  url:URL
  requestID:number
  worker:Worker
  handleEvent:Event => mixed
  requests:{[mixed]:{resolve(mixed):void, reject(mixed):void }}
  */
  constructor(url, worker, requestID) {
    this.url = url
    this.worker = worker
    this.requestID = requestID
    this.requests = {}
    worker.addEventListener("messageerror", this)
    worker.addEventListener("error", this)
    worker.addEventListener("message", this)
  }
  send(message /*:mixed*/) {
    this.worker.postMessage([this.requestID++, message])
  }
  request(message /*:mixed*/) /*:Promise<mixed>*/ {
    const id = `@${this.requestID++}`
    return new Promise((resolve, reject) => {
      this.requests[id] = { resolve, reject }
      this.worker.postMessage([id, message])
    })
  }
  handleEvent(event /*:MessageEvent*/) {
    switch (event.type) {
      case "error":
      case "messageerror": {
        return this.kill(event)
      }
      case "message": {
        this.receive(event.data)
      }
    }
  }
  kill(reason) {
    const { url, worker, requests } = this
    delete Worker[url.href]
    worker.terminate()
    for (const id in requests) {
      requests[id].reject(reason)
    }
  }
  receive(data) {
    const { requests } = this
    const [id, payload] = Array.isArray(data) ? data : []
    const request = requests[id]
    if (request == null) {
      throw Error(`Invalid message was received from worker`)
    } else {
      delete requests[id]
      request.resolve(payload)
    }
  }
}

export const spawn = future((url /*:URL*/) => {
  Service.spawn(url)
})

export const kill = future((url /*:URL*/, reason /*:?Error*/ = null) => {
  const service = Worker[`@${url.href}`]
  if (service) {
    service.kill()
  }
})

export const send = future((url /*:URL*/, message /*:mixed*/) => {
  Service.spawn(url).send(message)
})

export const request = future((url /*:URL*/, message /*:mixed*/) => {
  return Service.spawn(url).request(message)
})
