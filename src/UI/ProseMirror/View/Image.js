// @flow strict

import type { Node } from "prosemirror-model"
import type { EditorView } from "prosemirror-view"
import Inline from "./Inline"

export default class Image extends Inline {
  markup: Element
  handleEvent: ProgressEvent => mixed
  render(node: Node, editor: EditorView): Element {
    const document = editor.root.ownerDocument || editor.root
    const picture = document.createElement("picture")
    picture.classList.add("image")

    const markup = document.createElement("span")
    markup.classList.add("image", "markup")

    const container = document.createElement("span")
    container.classList.add("image", "container")
    container.setAttribute("contenteditable", "false")

    const image = document.createElement("img")
    image.addEventListener("load", this)
    image.addEventListener("error", this)
    image.setAttribute("src", node.attrs.src)
    image.setAttribute("alt", node.attrs.alt)
    image.setAttribute("title", node.attrs.title)

    this.markup = markup

    picture.appendChild(markup)
    picture.appendChild(container)
    container.appendChild(image)

    return picture
  }
  onLoad(event: ProgressEvent) {
    this.dom.classList.add("loaded")
  }
  onError(event: ProgressEvent) {
    this.dom.classList.add("not-found")
  }
  handleEvent(event: ProgressEvent): mixed {
    switch (event.type) {
      case "load":
        return this.onLoad(event)
      case "error":
        return this.onError(event)
      default:
        return null
    }
  }
  content(element: Element): Element {
    return this.markup
  }
  selectNode() {
    this.dom.classList.add("selected")
  }
  deselectNode() {
    this.dom.classList.remove("selected")
  }
  ignoreMutation() {
    return true
  }
}
