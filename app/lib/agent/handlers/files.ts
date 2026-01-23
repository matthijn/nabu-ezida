import type { Handler } from "../types"
import { getFileRaw, updateFileRaw, updateFileParsed, deleteFile, applyFilePatch, type FileResult } from "~/lib/files"
import type { FieldRejection } from "~/domain/sidecar"

type Operation = {
  type: "create_file" | "update_file" | "delete_file"
  path: string
  diff?: string
}

type ApplyPatchResult =
  | { status: "completed"; output: string }
  | { status: "failed"; output: string }

const formatRejection = (r: FieldRejection): string =>
  r.reason === "readonly"
    ? `${r.field}: readonly - ${r.hint}`
    : `${r.field}: ${r.issues.map(i => i.message).join(", ")}`

const formatPartialResult = (
  path: string,
  verb: string,
  rejected: FieldRejection[]
): string => {
  const rejectedText = rejected.map(formatRejection).join("; ")
  return `${verb} ${path} (partial). Rejected fields: ${rejectedText}`
}

const storeOkResult = (result: Extract<FileResult, { status: "ok" }>): void => {
  if (result.parsed) {
    updateFileParsed(result.path, result.content, result.parsed)
  } else {
    updateFileRaw(result.path, result.content)
  }
}

const storePartialResult = (result: Extract<FileResult, { status: "partial" }>): void => {
  updateFileParsed(result.path, result.content, result.parsed)
}

const toApplyPatchResult = (result: FileResult, verb: string): ApplyPatchResult => {
  switch (result.status) {
    case "ok":
      storeOkResult(result)
      return { status: "completed", output: `${verb} ${result.path}` }
    case "partial":
      storePartialResult(result)
      return { status: "completed", output: formatPartialResult(result.path, verb, result.rejected) }
    case "error":
      return { status: "failed", output: result.error }
  }
}

const handleCreateFile = (path: string, diff: string): ApplyPatchResult =>
  toApplyPatchResult(applyFilePatch(path, "", diff), "Created")

const handleUpdateFile = (path: string, diff: string): ApplyPatchResult =>
  toApplyPatchResult(applyFilePatch(path, getFileRaw(path), diff), "Updated")

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
