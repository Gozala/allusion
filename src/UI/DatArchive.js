// @flow

interface InitOptions { title: string; description: string }
interface ChooseOptions {
  title: string;
  buttonLabel: string;
  filters?: { isOwner: boolean };
}
export opaque type DatURL: string = string
export type URL = string

export interface DatArchiveFactory {
  new(DatURL): DatArchive;
  create(?InitOptions): Promise<DatArchive>;
  fork(DatURL, ?InitOptions): Promise<DatArchive>;
  selectArchive(?ChooseOptions): Promise<DatArchive>;
  resolveName(URL): Promise<DatURL>;
}

interface ArchiveInfo {
  key: string;
  url: DatURL;
  version: number;
  peers: number;
  isOwner: boolean;
  title: string;
  description: string;
  forkOf: DatURL | DatURL[];
  createdBy: {
    url: DatURL,
    title: string
  };
  mtime: number;
  metaSize: number;
  stagingSize: number;
}

interface Timeout {
  timeout: number;
}
export type Path = string

interface Stat {
  size: number;
  blocks: number;
  downloaded: number;
  mtime: Date;
  ctime: Date;
  isDirectory(): boolean;
  isFile(): boolean;
}

export type Encoding = "utf8" | "base64" | "hex"

interface Change {
  change: "add" | "remove" | "del";
  type: "dir" | "file";
  path: Path;
}

interface Revision {
  path: Path;
  version: number;
  type: "put" | "del";
}

interface ActivitiStream {
  close(): void;
}

interface FileActivity {
  path: Path;
}

interface FileActivityStream extends ActivitiStream {
  addEventListener("changed", (FileActivity) => void): void;
  addEventListener("invalidated", (FileActivity) => void): void;
}

interface FeedActivity {
  feed: "metadata" | "content";
}

interface LoadActivity extends FeedActivity {
  block: number;
  bytes: number;
}

interface NetworkActivityStream extends ActivitiStream {
  addEventListener("network-changed", ({ connections: number }) => void): void;
  addEventListener("download", (LoadActivity) => void): void;
  addEventListener("upload", (LoadActivity) => void): void;
  addEventListener("sync", (FeedActivity) => void): void;
}

export interface DatArchive {
  url: DatURL;
  getInfo(?Timeout): Promise<ArchiveInfo>;
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
  ): Promise<Stat[]>;
  writeFile(Path, string, options?: { encoding: Encoding }): Promise<void>;
  writeFile(Path, ArrayBuffer, options?: { encoding: "binary" }): Promise<void>;
  mkdir(Path): Promise<void>;
  unlink(Path): Promise<void>;
  rmdir(Path, options?: { recursive: boolean }): Promise<void>;
  diff(options?: { timeout?: number, shallow?: boolean }): Promise<Change[]>;
  commit(): Promise<Change[]>;
  revert(): Promise<Change[]>;
  history(options?: {
    start: number,
    end: number,
    revese?: boolean,
    timeout?: number
  }): Promise<Revision[]>;
  download(Path, ?Timeout): Promise<void>;
  createFileActivityStream(pattern?: string | string[]): FileActivityStream;
  createNetworkActivityStream(): NetworkActivityStream;
}

window.DatArchive.new = (url: DatURL): DatArchive => new window.DatArchive(url)

export default (window.DatArchive: DatArchiveFactory)
