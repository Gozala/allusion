// @flow strict

export const onEdit = {
  decode(event/*:any*/) {
    return {
      message: {
        tag: "onEdit",
        value: event.detail
      }
    }
  }
}