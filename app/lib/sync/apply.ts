import { applyFilePatch, updateFileRaw, deleteFile, renameFile, getFileRaw } from "~/lib/files"
import type { Command } from "./types"

export const applyCommand = (command: Command): void => {
  const { action, path, diff } = command

  if (!path) return

  switch (action) {
    case "CreateFile":
      if (!diff) return
      applyCreateFile(path, diff)
      break

    case "UpdateFile":
      if (!diff) return
      applyUpdateFile(path, diff)
      break

    case "DeleteFile":
      deleteFile(path)
      break

    case "RenameFile":
      if (!diff) return
      renameFile(path, diff)
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
    console.error(`[apply] createFile failed: "${path}"`, result)
  }
}

const applyUpdateFile = (path: string, diff: string): void => {
  const current = getFileRaw(path)
  const result = applyFilePatch(path, current, diff, { skipCodeValidation: true })
  if (result.status === "ok") {
    updateFileRaw(result.path, result.content)
  } else {
    console.error(`[apply] updateFile failed: "${path}"`, result)
  }
}
