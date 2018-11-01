// @flow strict

/*::

interface Link {
  href:string;
  rel?:string;
  crossorigin?:string;
  rev?:string;
  media?:string;
  nonce?:string;
  hreflang?:string;
  type?:string;
  referrerpolicy?:string;
  sizes?:string;
  title?:string;
}

interface Create {
  title: string;
  description: string;
  type?:string[];
  links?:Link[];
  prompt?:boolean; 
}

export interface Fork extends Create {}

export interface Select {
  title: string;
  buttonLabel: string;
  filters?: Filter;
}

export type Filter = {
  isOwner?: boolean;
  type?:string[];
}

export opaque type DatURL: string = string
export type URL = string

export interface ArchiveFactory {
  load(URL): Promise<Archive>;
  create(?Create): Promise<Archive>;
  fork(URL, ?Fork): Promise<Archive>;
  unlink(URL):Promise<void>;
  selectArchive(?Select): Promise<Archive>;
  resolveName(URL): Promise<DatURL>;
}

export interface Archive extends NetworkActivityStream {
  url: DatURL;

  getInfo(?Timeout): Promise<ArchiveInfo>;

  configure(ArchiveConfig):Promise<void>;

  stat(Path, ?Timeout): Promise<Stat>;

  readFile(
    Path,
    options?: { encoding: Encoding, timeout?: number }
  ): Promise<string>;
  readFile(
    Path,
    options: { encoding: "binary", timeout?: number }
  ): Promise<ArrayBuffer>;

  readdir(
    Path,
    options?: { recursive?: boolean, timeout?: number, stat?: false }
  ): Promise<string[]>;
  readdir(
    Path,
    options: { recursive?: boolean, timeout?: number, stat: true }
  ): Promise<DirectoryEntry>;
  
  writeFile(Path, string, options?: { encoding: Encoding }): Promise<void>;
  writeFile(Path, ArrayBuffer, options?: { encoding: "binary" }): Promise<void>;

  mkdir(Path, options?:?Timeout): Promise<void>;

  unlink(Path): Promise<void>;

  rmdir(Path, options?: { recursive: boolean }): Promise<void>;

  rename(Path, Path, options:?Timeout):Promise<void>; 
  copy(Path, Path, options:?Timeout):Promise<void>;

  history(?History):Promise<Revision[]>;
  
  checkout(version:number):Promise<void>;
  
  download(Path, ?Timeout):Promise<void>;

  watch(pattern?: string | string[], ?FileWatcher):FileActivityStream;
}

export interface ArchiveInfo {
  key: string;
  url: DatURL;
  isOwner: boolean;

  version: number;
  peers: number;
  mtime: number;
  size: number;
  
  title: string;
  description: string;
  type:string[];
  links:Link[];
}

export interface ArchiveConfig {
  title:string;
  description:string;
  type:string[];
  links:Link[];
  web_root:string;
  fallback_page:string;
  timeout:number;
}

export interface Timeout {
  timeout: number;
}
export type Path = string

export interface Stat {
  isDirectory(): boolean;
  isFile(): boolean;

  size: number;
  blocks: number;
  downloaded: number;

  mtime: Date;
  ctime: Date;
}

export interface DirectoryEntry {
  name:string;
  stat:Stat;
}


export type Encoding = "utf-8" | "utf8" | "base64" | "hex"

interface Change {
  change: "add" | "remove" | "del";
  type: "dir" | "file";
  path: Path;
}

interface History {
  start: number,
  end: number,
  revese?: boolean,
  timeout?: number
}

interface Revision {
  path: Path;
  version: number;
  type: "put" | "del";
}

type FileWatcher = (FileActivity) => void;

interface ActivitiStream {
  close(): void;
}

export interface FileActivity {
  path: Path;
}

interface FileActivityStream extends ActivitiStream {
  addEventListener("changed", FileWatcher): void;
  addEventListener("invalidated", FileWatcher): void;
}

interface FeedActivity {
  feed: "metadata" | "content";
}

interface LoadActivity extends FeedActivity {
  block: number;
  bytes: number;
}

interface ConnectionActivity {
  connections: number
}

type ConnectionWatcher = ConnectionActivity => void
type LoadWatcher = LoadActivity => void
type FeedWatcher = FeedActivity => void

interface NetworkActivityStream {
  addEventListener("network-changed", ConnectionWatcher): void;
  addEventListener("download" | "upload", LoadWatcher): void;
  addEventListener("sync", FeedWatcher): void;
}

*/

export const DatArchive /*:ArchiveFactory*/ =
  window.DatArchive || window.top.DatArchive
