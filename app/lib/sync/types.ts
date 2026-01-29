export type Action = "CreateFile" | "UpdateFile" | "DeleteFile" | "RenameFile" | "Commit"

export type Command = {
  action: Action
  path?: string
  newPath?: string
  diff?: string
}

export type CommandResult =
  | { ok: true }
  | { ok: false; error: string }
