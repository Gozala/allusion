// @flow strict

import { DatArchive } from "../beaker/DatArchive.js"
import Future from "../Future/Future.js"

/*::
import type { Archive, Select, Create, ArchiveInfo, Timeout, Stat, DirectoryEntry, Encoding } from "../beaker/DatArchive.js"
*/

const archives /*:{[string]:Archive}*/ = {}
const none /*:Object*/ = Object.freeze({})

export const load = (url /*:URL*/) =>
  new Future(async () /*:Promise<Archive>*/ => {
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

export const select = (options /*:?Select*/) =>
  new Future(async () => {
    const archive = await DatArchive.selectArchive(options)
    const url = new URL(archive.url)
    archives[url.host] = archive
    return url
  })

export const getInfo = (url /*:URL*/, options /*::?:Timeout*/) =>
  new Future(async () => {
    const archive = await load(url)
    const info = await archive.getInfo(options)
    return info
  })

export const stat = (url /*:URL*/, options /*::?:Timeout*/) =>
  new Future(async () => {
    const archive = await load(url)
    const stat = await archive.stat(decodeURIComponent(url.pathname), options)
    return stat
  })

export const readFile = (
  url /*:URL*/,
  options /*::?: { encoding: Encoding, timeout?: number }*/
) =>
  new Future(async () => {
    const archive = await load(url)
    const content = await archive.readFile(
      decodeURIComponent(url.pathname),
      options
    )
    return content
  })

export const writeFile = (
  url /*:URL*/,
  content /*:string*/,
  options /*::?: { encoding: Encoding, timeout?: number }*/
) =>
  new Future(async () => {
    const archive = await load(url)
    await archive.writeFile(decodeURIComponent(url.pathname), content, options)
  })

export const readFileBuffer = (url /*:URL*/, options /*:Timeout*/ = none) =>
  new Future(async () => {
    const archive = await load(url)
    const { timeout } = options
    const buffer = await archive.readFile(decodeURIComponent(url.pathname), {
      encoding: "binary",
      timeout
    })
    return buffer
  })

export const writeFileBuffer = (
  url /*:URL*/,
  buffer /*:ArrayBuffer*/,
  options /*:Timeout*/ = none
) =>
  new Future(async () => {
    const archive = await load(url)
    const { timeout } = options
    await archive.writeFile(decodeURIComponent(url.pathname), buffer, {
      encoding: "binary",
      timeout
    })
  })

export const removeFile = (url /*:URL*/, options /*:Timeout*/ = none) =>
  new Future(async () => {
    const archive = await load(url)
    await archive.unlink(url.pathname)
  })

export const readDirectoryPaths = async (
  url /*:URL*/,
  options /*: { recursive?: boolean, timeout?: number }*/ = none
) =>
  new Future(async () => {
    const archive = await load(url)
    const { recursive, timeout } = options
    return await archive.readdir(decodeURIComponent(url.pathname), {
      recursive,
      timeout,
      stat: false
    })
  })

export const readDirectoryEntries = (
  url /*:URL*/,
  options /*:{ recursive?: boolean, timeout?: number }*/ = none
) =>
  new Future(async () => {
    const archive = await load(url)
    const { recursive, timeout } = options
    return await archive.readdir(decodeURIComponent(url.pathname), {
      recursive,
      timeout,
      stat: true
    })
  })

export const removeDirectory = (
  url /*:URL*/,
  options /*::?:{recursive:boolean}*/
) =>
  new Future(async () => {
    const archive = await load(url)
    await archive.rmdir(decodeURIComponent(url.pathname), options)
  })

export const move = (from /*:URL*/, to /*:URL*/, options /*:Timeout*/ = none) =>
  new Future(async () => {
    const source = await load(from)
    if (from.host === to.host) {
      await source.rename(
        decodeURIComponent(from.pathname),
        decodeURIComponent(to.pathname),
        options
      )
    } else {
      const { timeout } = options
      const target = await load(to)
      const config = { encoding: "binary", options }
      const buffer = await source.readFile(from.pathname, config)
      await target.writeFile(to.pathname, buffer, config)
      source.unlink(from.pathname)
    }
  })

export const copy = (from /*:URL*/, to /*:URL*/, options /*:Timeout*/ = none) =>
  new Future(async () => {
    const source = await load(from)
    if (from.host === to.host) {
      await source.copy(
        decodeURIComponent(from.pathname),
        decodeURIComponent(to.pathname),
        options
      )
    } else {
      const { timeout } = options
      const target = await load(to)
      const config = { encoding: "binary", options }
      const buffer = await source.readFile(from.pathname, config)
      await target.writeFile(to.pathname, buffer, config)
    }
  })

export const create = (options /*:Create*/) =>
  new Future(async () => {
    const archive = await DatArchive.create(options)
    return new URL(archive.url)
  })
