// @flow strict

export default class Future /*::<a> extends Promise<a>*/ {
  /*::
  call:() => Promise<a>
  */
  constructor(call /*:() => Promise<a>*/) {
    /*::super(() => {})*/
    this.call = call
  }
  then(onResolve /*:any*/, onReject /*:any*/) /*:any*/ {
    return this.call().then(onResolve, onReject)
  }
}
