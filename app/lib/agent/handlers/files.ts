import type { Handler } from "../types"
import { getFileContent, updateFile, deleteFile } from "~/lib/files"
import { applyPatch } from "~/lib/files"

type Operation = {
  type: "create_file" | "update_file" | "delete_file"
  path: string
  diff?: string
}

type ApplyPatchResult =
  | { status: "completed"; output: string }
  | { status: "failed"; output: string }

const handleCreateFile = (path: string, diff: string): ApplyPatchResult => {
  const result = applyPatch("", diff)
  if (!result.ok) {
    return { status: "failed", output: result.error }
  }
  updateFile(path, result.content)
  return { status: "completed", output: `Created ${path}` }
}

const handleUpdateFile = (path: string, diff: string): ApplyPatchResult => {
  const current = getFileContent(path)
  const result = applyPatch(current, diff)
  if (!result.ok) {
    return { status: "failed", output: result.error }
  }
  updateFile(path, result.content)
  return { status: "completed", output: `Updated ${path}` }
}

const handleDeleteFile = (path: string): ApplyPatchResult => {
  deleteFile(path)
  return { status: "completed", output: `Deleted ${path}` }
}

export const applyPatchTool: Handler = async (_, args) => {
  const operation = args.operation as Operation | undefined

  if (!operation) {
    return { status: "failed", output: "operation is required" }
  }

  const { type, path, diff } = operation

  if (!path) {
    return { status: "failed", output: "operation.path is required" }
  }

  switch (type) {
    case "create_file":
      if (!diff) return { status: "failed", output: "diff is required for create_file" }
      return handleCreateFile(path, diff)

    case "update_file":
      if (!diff) return { status: "failed", output: "diff is required for update_file" }
      return handleUpdateFile(path, diff)

    case "delete_file":
      return handleDeleteFile(path)

    default:
      return { status: "failed", output: `Unknown operation type: ${type}` }
  }
}
