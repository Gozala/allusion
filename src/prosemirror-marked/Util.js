// @flow strict

export const debounce = /*::<a>*/(f/*: a => mixed*/, time/*: number*/)/*: (a => void)*/ => {
  let id = null
  return (param/*: a*/)/*: void*/ => {
    if (id != null) {
      clearTimeout(id)
    }
    id = setTimeout(f, time, param)
  }
}
