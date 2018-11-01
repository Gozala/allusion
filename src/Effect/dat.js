// @flow strict

import { DatArchive } from "../beaker/DatArchive.js"
import { future } from "../reflex/Future.js"

/*::
import type { Archive, Select, ArchiveInfo, Timeout, Stat, Encoding } from "../beaker/DatArchive.js"
*/

const archives /*:{[string]:Archive}*/ = {}
const none /*:Object*/ = Object.freeze({})

export const load = future(async (url /*:URL*/) /*:Promise<Archive>*/ => {
  const { protocol, host } = url
  const archive = archives[host]
  if (archive) {
    return archive
  } else {
    const archive /*:Archive*/ = await DatArchive.load(`${protocol}//${host}`)
    archives[host] = archive
    return archive
  }
})

export const select = future(async (options /*:?Select*/) /*:Promise<URL>*/ => {
  const archive = await DatArchive.selectArchive(options)
  const url = new URL(archive.url)
  archives[url.host] = archive
  return url
})

export const getInfo = future(async (
  url /*:URL*/,
  options /*::?:Timeout*/
) /*:Promise<ArchiveInfo>*/ => {
  const archive = await load(url)
  const info = await archive.getInfo(options)
  return info
})

export const stat = future(async (
  url /*:URL*/,
  options /*::?:Timeout*/
) /*: Promise<Stat>*/ => {
  const archive = await load(url)
  const stat = await archive.stat(url.pathname, options)
  return stat
})

export const readFile = future(async (
  url /*:URL*/,
  options /*::?: { encoding: Encoding, timeout?: number }*/
) /*:Promise<string>*/ => {
  const archive = await load(url)
  const content = await archive.readFile(url.pathname, options)
  return content
})

export const writeFile = future(async (
  url /*:URL*/,
  content /*:string*/,
  options /*::?: { encoding: Encoding, timeout?: number }*/
) /*:Promise<void>*/ => {
  const archive = await load(url)
  await archive.writeFile(url.pathname, content, options)
})

export const readFileBuffer = future(async (
  url /*:URL*/,
  options /*:Timeout*/ = none
) /*:Promise<ArrayBuffer>*/ => {
  const archive = await load(url)
  const { timeout } = options
  const buffer = await archive.readFile(url.pathname, {
    encoding: "binary",
    timeout
  })
  return buffer
})

export const writeFileBuffer = future(async (
  url /*:URL*/,
  buffer /*:ArrayBuffer*/,
  options /*:Timeout*/ = none
) /*:Promise<void>*/ => {
  const archive = await load(url)
  const { timeout } = options
  await archive.writeFile(url.pathname, buffer, {
    encoding: "binary",
    timeout
  })
})

export const removeFile = future(async (
  url /*:URL*/,
  options /*:Timeout*/ = none
) /*:Promise<void>*/ => {
  const archive = await load(url)
  await archive.unlink(url.pathname)
})

export const readDirectoryPaths = future(async (
  url /*:URL*/,
  path /*:string*/,
  options /*: { recursive?: boolean, timeout?: number }*/ = none
) /*:Promise<string>*/ => {
  const archive = await load(url)
  const { recursive, timeout } = options
  return await archive.readdir(url.pathname, {
    recursive,
    timeout,
    stat: false
  })
})

export const readDirectoryEntries = future(async (
  url /*:URL*/,
  options /*:{ recursive?: boolean, timeout?: number }*/ = none
) /*:Promise<Stat>*/ => {
  const archive = await load(url)
  const { recursive, timeout } = options
  return await archive.readdir(url.pathname, { recursive, timeout, stat: true })
})

export const removeDirectory = future(async (
  url /*:URL*/,
  options /*::?:{recursive:boolean}*/
) /*:Promise<void>*/ => {
  const archive = await load(url)
  await archive.rmdir(url.pathname, options)
})

export const move = future(async (
  from /*:URL*/,
  to /*:URL*/,
  options /*:Timeout*/ = none
) /*:Promise<void>*/ => {
  const source = await load(from)
  if (from.host === to.host) {
    await source.rename(from.pathname, to.pathname, options)
  } else {
    const { timeout } = options
    const target = await load(to)
    const config = { encoding: "binary", options }
    const buffer = await source.readFile(from.pathname, config)
    await target.writeFile(to.pathname, buffer, config)
    source.unlink(from.pathname)
  }
})

export const copy = future(async (
  from /*:URL*/,
  to /*:URL*/,
  options /*:Timeout*/ = none
) /*:Promise<void>*/ => {
  const source = await load(from)
  if (from.host === to.host) {
    await source.copy(from.pathname, to.pathname, options)
  } else {
    const { timeout } = options
    const target = await load(to)
    const config = { encoding: "binary", options }
    const buffer = await source.readFile(from.pathname, config)
    await target.writeFile(to.pathname, buffer, config)
  }
})
