// @noflow

export interface Process<message> {
  send(message): void;
}

export interface Service<inn, out, model> {
  id?: number;
  toID(inn): string;
  init(): model;
  request(inn, model, Process<out>): model;
  cancel(inn, model): model;
}

interface State<message> {
  id: 0;
  processes: {
    [number | string]: Spawn<message, *>
  };
}

class Spawn<message, model> {
  service: Service<message, model>
  state: model
  inbox: { [string]: message }
  constructor(
    service: Service<message, model>,
    state: model,
    inbox: { [string]: message }
  ) {
    this.service = service
    this.state = state
    this.inbox = inbox
  }
  request(payload: message, mailbox: Mailbox<out>) {}
}

const spawn = <message, model>(service: Service<message, model>) =>
  new Spawn(service, service.init(), (Object.create(null): Object))

class Visited {
  static pool: Set<string>[]
  static new(): Set<string> {
    if (Visited.pool.length) {
      return Visited.pool.shift()
    } else {
      return new Set()
    }
  }
  static delete(set: Set<string>): void {
    Visited.pool.push(set)
    set.clear()
  }
}

interface Sub<a> {
  payload: a;
  service: Service<a, *>;
}

const fx = function<a>(
  state: State<a>,
  subs: Sub<a>[],
  mailbox: Process<a>
): State<a> {
  const visited = Visited.new()
  for (let sub of subs) {
    const { service, payload } = sub
    const id = service.id || (service.id = ++state.id)
    const process = state.processes[id] || spawn(service)
    const messageID = service.toID(payload)
    visited.add(`${id}/${messageID}`)
    const inInbox = this.inbox[messageID]
    if (!inInbox) {
      process.request(payload, mailbox)
    }
  }

  for (let pid in state.processes) {
    const process = state.processes[pid]
    const { inbox, service } = process
    for (let messageID in inbox) {
      const id = `${pid}/${messageID}`
      if (!visited.has(id)) {
        process.state = service.cancel(inbox[messageID], process.state)
      }
    }
  }

  Visited.delete(visited)
  return state
}
