// @flow strict
/*::
export type Route =
  | { tag: "root" }
  | { tag: "draft", value: string }
  | { tag: "published", value: URL }
*/

export const fromURL = (url /*:URL*/) /*:Route*/ => {
  if (url.pathname === "/") {
    return { tag: "root" }
  } else if (url.pathname.startsWith("/~/")) {
    return { tag: "draft", value: url.pathname.substr(3) }
  } else {
    return {
      tag: "published",
      value: new URL(`${url.protocol}/${url.pathname}`)
    }
  }
}
