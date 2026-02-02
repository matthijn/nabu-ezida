import { updateFileRaw, deleteFile, renameFile, getFileRaw, applyFilePatch } from "~/lib/files"
import type { Command } from "./types"

export const applyCommand = (command: Command): void => {
  const { action, path, content, diff, newPath } = command

  if (!path) return

  switch (action) {
    case "CreateFile":
      if (diff) {
        applyCreateFile(path, diff)
      } else if (content !== undefined) {
        updateFileRaw(path, content)
      }
      break

    case "UpdateFile":
      if (diff) {
        applyUpdateFile(path, diff)
      } else if (content !== undefined) {
        updateFileRaw(path, content)
      }
      break

    case "WriteFile":
      if (content !== undefined) {
        updateFileRaw(path, content)
      }
      break

    case "DeleteFile":
      deleteFile(path)
      break

    case "RenameFile":
      if (!newPath) return
      renameFile(path, newPath)
      break

    case "Commit":
      break
  }
}

const applyCreateFile = (path: string, diff: string): void => {
  const result = applyFilePatch(path, "", diff, { skipCodeValidation: true })
  if (result.status === "ok") {
    updateFileRaw(result.path, result.content)
  } else {
    console.error(`[apply] createFile failed: "${path}"`, result.error)
  }
}

const applyUpdateFile = (path: string, diff: string): void => {
  const current = getFileRaw(path)
  const result = applyFilePatch(path, current, diff, { skipCodeValidation: true })
  if (result.status === "ok") {
    updateFileRaw(result.path, result.content)
  } else {
    console.error(`[apply] updateFile failed: "${path}"`, result.error)
  }
}
