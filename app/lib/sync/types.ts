export type Action = "CreateFile" | "UpdateFile" | "WriteFile" | "DeleteFile" | "RenameFile" | "Commit"

export type Command = {
  action: Action
  path?: string
  newPath?: string
  content?: string
  diff?: string // incoming from websocket only
}

export type CommandResult =
  | { ok: true }
  | { ok: false; error: string }
