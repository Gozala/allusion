// @flow strict

/*::
type Run = () => void

type Enqueue<id, p, info> = (info => void, p) => id
type Abort<id> = id => void
*/

class Scheduler /*::<id, p, info>*/ {
  /*::
  enqueue: Enqueue<id, p, info>
  abort:Abort<id>
  */
  constructor(enqueue /*:Enqueue<id, p, info>*/, abort /*:Abort<id>*/) {
    this.enqueue = enqueue
    this.abort = abort
  }
  debounce /*::<ctx>*/(
    perform /*:(ctx, info) => void*/,
    param /*:p*/
  ) /*:ctx => void*/ {
    const { enqueue, abort } = this
    let token = null
    let context
    const run = (detail /*:info*/) => {
      token = null
      perform(context, detail)
    }

    return arg => {
      if (token != null) {
        abort(token)
      }
      context = arg
      token = enqueue(run, param)
    }
  }
}

/*::
interface IdleInfo {
  didTimeout: boolean,
  timeRemaining: () => number
}
*/

export const idle /*:Scheduler<IdleCallbackID, void|{timeout:number}, IdleInfo>*/ = new Scheduler(
  top.requestIdleCallback,
  top.cancelIdleCallback
)

export const timeout /*:Scheduler<TimeoutID, void|number, void>*/ = new Scheduler(
  top.setTimeout,
  top.clearTimeout
)

export const animation /*:Scheduler<AnimationFrameID, void,  DOMHighResTimeStamp>*/ = new Scheduler(
  top.requestAnimationFrame,
  top.cancelAnimationFrame
)
