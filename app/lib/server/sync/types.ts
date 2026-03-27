export type Action =
  | "CreateFile"
  | "UpdateFile"
  | "WriteFile"
  | "DeleteFile"
  | "RenameFile"
  | "Commit"
  | "SyncMeta"

export interface Command {
  action: Action
  path?: string
  newPath?: string
  content?: string
  diff?: string
  fileCount?: number
}

export type CommandResult = { ok: true } | { ok: false; error: string }
