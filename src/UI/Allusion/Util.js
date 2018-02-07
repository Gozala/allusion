// @flow

export const always = <a>(value: a): (() => a) => (): a => value
