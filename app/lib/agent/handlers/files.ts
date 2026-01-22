import type { Handler } from "../types"
import { getFileContent, updateFile, deleteFile, applyFilePatch, type FileResult } from "~/lib/files"

type Operation = {
  type: "create_file" | "update_file" | "delete_file"
  path: string
  diff?: string
}

type ApplyPatchResult =
  | { status: "completed"; output: string }
  | { status: "failed"; output: string }

const formatValidationError = (result: Extract<FileResult, { status: "validation_error" }>): string => {
  const issues = result.issues.map(i => `${i.path}: ${i.message}`).join(", ")
  return `Validation failed for ${result.path}: ${issues}. Current: ${JSON.stringify(result.current)}`
}

const toApplyPatchResult = (result: FileResult, verb: string): ApplyPatchResult => {
  switch (result.status) {
    case "ok":
      updateFile(result.path, result.content)
      return { status: "completed", output: `${verb} ${result.path}` }
    case "error":
      return { status: "failed", output: result.error }
    case "validation_error":
      return { status: "failed", output: formatValidationError(result) }
  }
}

const handleCreateFile = (path: string, diff: string): ApplyPatchResult =>
  toApplyPatchResult(applyFilePatch(path, "", diff), "Created")

const handleUpdateFile = (path: string, diff: string): ApplyPatchResult =>
  toApplyPatchResult(applyFilePatch(path, getFileContent(path), diff), "Updated")

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
