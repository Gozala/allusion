// @flow strict

import { attribute, property, style, on } from "./VirtualDOM.js"
/*::
import type {Attribute} from "./VirtualDOM.js"
*/

export { style, attribute, property, on }
// // TODO: defaultValue, defaultChecked, innerHTML, suppressContentEditableWarning, suppressHydrationWarning, style

export const defaultValue = /*::<a>*/ (value /*:string*/) /*:Attribute<a>*/ =>
  property("defaultValue", value)

export const value = /*::<a>*/ (value /*:string*/) /*:Attribute<a>*/ =>
  property("value", value)

export const acceptCharset = /*::<a>*/ (value /*:string*/) /*:Attribute<a>*/ =>
  property("accept-charset", value)

export const className = /*::<a>*/ (value /*:string*/) /*:Attribute<a>*/ =>
  attribute("class", value)

export const classList = /*::<a>*/ (
  ...values /*:string[]*/
) /*:Attribute<a>*/ => attribute("class", values.join(" "))

export const textContent = /*::<a>*/ (value /*:string*/) /*:Attribute<a>*/ =>
  property("textContent", value)

export const For = /*::<a>*/ (value /*:string*/) /*:Attribute<a>*/ =>
  attribute("for", value)
export const Equiv = /*::<a>*/ (value /*:string*/) /*:Attribute<a>*/ =>
  attribute("equiv", value)

export const data = /*::<a>*/ (
  name /*:string*/,
  value /*:string*/
) /*:Attribute<a>*/ => attribute(`data-${name}`, value)

const setHTMLAttribute = name => /*::<a>*/ (
  value /*:string*/ = ""
) /*:Attribute<a>*/ => attribute(name, value)

export const src = setHTMLAttribute("src")
export const srcset = setHTMLAttribute("srcset")
export const alt = setHTMLAttribute("alt")
export const href = setHTMLAttribute("href")
export const id = setHTMLAttribute("id")
export const accept = setHTMLAttribute("accept")
export const type = setHTMLAttribute("type")
export const placeholder = setHTMLAttribute("placeholder")
export const title = setHTMLAttribute("title")

const setBooleanHTMLAttribute = name => /*::<a>*/ (
  value /*:boolean*/
) /*:Attribute<a>*/ => attribute(name, value ? "true" : "false")

export const contentEditable = setBooleanHTMLAttribute("contenteditable")
export const draggable = setBooleanHTMLAttribute("draggable")
export const spellCheck = setBooleanHTMLAttribute("spellcheck")

const setBooleanSVGAttribute = name => /*::<a>*/ (
  value /*:boolean*/
) /*:Attribute<a>*/ => attribute(name, value ? "true" : "false")

export const autoReverse = setBooleanSVGAttribute("autoReverse")
export const externalResourcesRequired = setBooleanSVGAttribute(
  "externalResourcesRequired"
)
export const preserveAlpha = setBooleanSVGAttribute("preserveAlpha")

const setModalHTMLAttribute = name => /*::<a>*/ (
  value /*:boolean*/ = true
) /*:Attribute<a>*/ => attribute(name, value ? "" : null)

export const allowFullScreen = setModalHTMLAttribute("allowfullscreen")
export const async = setModalHTMLAttribute("async")
export const autoFocus = setModalHTMLAttribute("autofocus")
export const autoPlay = setModalHTMLAttribute("autoplay")
export const controls = setModalHTMLAttribute("controls")
export const htmlDefault = setModalHTMLAttribute("default")
export const defer = setModalHTMLAttribute("defer")
export const disabled = setModalHTMLAttribute("disabled")
export const formNoValidate = setModalHTMLAttribute("formnovalidate")
export const hidden = setModalHTMLAttribute("hidden")
export const loop = setModalHTMLAttribute("loop")
export const noValidate = setModalHTMLAttribute("novalidate")
export const open = setModalHTMLAttribute("open")
export const playsInline = setModalHTMLAttribute("playsinline")
export const readOnly = setModalHTMLAttribute("readonly")
export const required = setModalHTMLAttribute("required")
export const reversed = setModalHTMLAttribute("reversed")
export const scoped = setModalHTMLAttribute("scoped")
export const seamless = setModalHTMLAttribute("seamless")
export const itemScope = setModalHTMLAttribute("itemscope")

const setBooleanProperty = name => /*::<a>*/ (
  value /*:boolean*/
) /*:Attribute<a>*/ => property(name, value)

export const checked = setBooleanProperty("checked")
export const multiple = setBooleanProperty("multiple")
export const muted = setBooleanProperty("muted")
export const selected = setBooleanProperty("selected")

const setOptionalStringAttribute = name => /*::<a>*/ (
  value /*:string*/ = ""
) /*:Attribute<a>*/ => attribute(name, value)

export const capture = setOptionalStringAttribute("capture")
export const download = setOptionalStringAttribute("download")

const setNumberAttribute = name => /*::<a>*/ (
  value /*:number*/
) /*:Attribute<a>*/ => attribute(name, `${value}`)

export const cols = setNumberAttribute("cols")
export const rows = setNumberAttribute("rows")
export const size = setNumberAttribute("size")
export const span = setNumberAttribute("span")
export const tabIndex = setNumberAttribute("tabindex")

export const rowSpan = setNumberAttribute("rowSpan")
export const start = setNumberAttribute("start")
