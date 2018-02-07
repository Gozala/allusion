// @flow

export default class Agent<model> {
  state: Promise<model>
  constructor(init: () => Promise<model>) {
    this.state = init()
  }
  update<action>(
    update: (model, action) => Promise<model>,
    options: action
  ): Agent<model> {
    Agent.update(this, update, options)
    return this
  }
  get<value>(get: model => Promise<value>): Promise<value> {
    return Agent.get(this, get)
  }

  static async call<inn, out>(
    agent: Agent<model>,
    fn: (model, inn) => Promise<[model, out]>,
    options: inn
  ): Promise<out> {
    const [state, result] = await fn(await agent.state, options)
    return result
  }
  static async transact<action>(
    agent: Agent<model>,
    update: (model, action) => Promise<model>,
    options: action
  ): Promise<model> {
    const state = await agent.state
    return await update(state, options)
  }
  static spawn(init: () => Promise<model>): Agent<model> {
    return new Agent(init)
  }
  static async update<action>(
    agent: Agent<model>,
    update: (model, action) => Promise<model>,
    options: action
  ): Promise<model> {
    agent.state = Agent.transact(agent, update, options)
    return await agent.state
  }
  static async get<value>(
    agent: Agent<model>,
    get: model => Promise<value>
  ): Promise<value> {
    const state = await agent.state
    return await get(state)
  }
}
