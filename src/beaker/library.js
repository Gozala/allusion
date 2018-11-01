// @flow strict

/*::
export interface Library {
  add(url:string, opts:?Duration):Promise<UserSettings>;
  remove(url:string):Promise<UserSettings>;
  requestAdd(url:string, opts:?Duration):Promise<UserSettings>;
  requestRemove(url:string, opts:?UserSettings):Promise<UserSettings>;
  get(url:string):Promise<UserSettings>;
  list(query?:Query):Promise<ArchiveInfo[]>;
  addEventListener("added", ({url:string}) => mixed):void;
  addEventListener("removed", ({url:string}) => mixed):void;
  addEventListener("updated", (UpdatedEvent) => mixed):void;
  addEventListener("network-changed", (NetworkChangeEvent) => mixed):void;
}


export interface Duration {
  duration:number
}

export interface UserSettings {
  isSaved: boolean;
  expiresAt: number;
}

export interface Query {
  inMemory?:boolean;
  isSaved?:boolean;
  isNetworked?:boolean;
  isOwner?:boolean;
}

export interface ArchiveInfo {
  url: string;
  title: string;
  description: string;
  size: number;
  mtime: number;
  isOwner: boolean;
  userSettings: UserSettings;
  peers: number;
}

export interface UpdatedEvent {
  url:string;
  title:string;
  description:string;
  size:number;
  mtime:number;
  isOwner:boolean;
}

export interface NetworkChangeEvent {
  url:string;
  connections:number;
}
*/

export const library /*:Library*/ =
  window.experimental.library || window.top.experimental.library
