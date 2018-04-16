// @flow strict

import type { Match } from "match.flow"

export interface Mailbox<message> {
  send(message): void;
}

interface Display<model> {
  render(model, Document): ?Element;
}

type View<message, model> = (Mailbox<message>) => Display<model>

export type Program<message, model, options = void> = {
  init: options => model,
  update: Match<model, message>,
  receive: model => Promise<message[]>,
  view: View<message, model>
}

export default class Process<message, model, options = void> {
  state: model
  inbox: message[]
  mount: HTMLElement
  dom: ?Element
  program: Program<message, model, options>
  view: View<message, model>
  display: Display<model>
  update: (message, model) => model
  receive: model => Promise<message[]>
  parked: boolean
  constructor(
    { view, update, receive }: Program<message, model, options>,
    mount: HTMLElement,
    dom: ?Element,
    inbox: message[],
    parked: boolean
  ) {
    this.view = view
    this.update = update
    this.receive = receive
    this.inbox = inbox
    this.mount = mount
    this.dom = dom
    this.parked = parked
  }
  async transact() {
    const dom = this.display.render(this.state, this.mount.ownerDocument)
    if (this.dom != dom) {
      if (this.dom) {
        if (dom) {
          this.mount.replaceChild(dom, this.dom)
        } else {
          this.mount.removeChild(this.dom)
        }
      } else if (dom) {
        this.mount.appendChild(dom)
      }
      this.dom = dom
    }

    const messages = await this.receive(this.state)
    for (let payload of messages) {
      this.send(payload)
    }
  }
  send(payload: message) {
    this.inbox.push(payload)
    if (this.parked) {
      this.unpark()
    }
  }
  async unpark() {
    try {
      this.parked = false
      while (this.inbox.length > 0) {
        const message = await this.inbox.shift()
        this.state = this.update(message, this.state)
        this.transact()
      }
      this.parked = true
    } catch (error) {
      this.parked = true
      throw error
    }
  }

  static spawn<message, model, options>(
    program: Program<message, model, options>,
    config: { options: options, node: HTMLElement }
  ): Process<message, model, options> {
    const process = new Process(program, config.node, null, [], true)
    process.state = program.init(config.options)
    process.display = program.view(process)
    process.transact()
    return process
  }
}
