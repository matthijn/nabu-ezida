import type { Handler, ToolDeps } from "../types"
import { getFileRaw, updateFileRaw, deleteFile, applyFilePatch, type FileResult } from "~/lib/files"
import { sendCommand, type Command, type Action } from "~/lib/sync"
import type { FieldRejection } from "~/domain/attributes"

type OperationType = "create_file" | "update_file" | "delete_file"

type Operation = {
  type: OperationType
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

const storeResult = (result: Extract<FileResult, { status: "ok" | "partial" }>): void => {
  updateFileRaw(result.path, result.content)
}

const toApplyPatchResult = (result: FileResult, verb: string): ApplyPatchResult => {
  switch (result.status) {
    case "ok":
      storeResult(result)
      return { status: "completed", output: `${verb} ${result.path}` }
    case "partial":
      storeResult(result)
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

const operationTypeToAction: Record<OperationType, Action> = {
  create_file: "CreateFile",
  update_file: "UpdateFile",
  delete_file: "DeleteFile",
}

const persistToServer = (projectId: string, operation: Operation): void => {
  const command: Command = {
    action: operationTypeToAction[operation.type],
    path: operation.path,
    diff: operation.diff,
  }
  sendCommand(projectId, command).catch(() => {
    // Server sync failed - local state is ahead of server
    // Could implement retry logic or notify user
  })
}

export const applyPatchTool: Handler = async (deps: ToolDeps, args) => {
  const operation = args.operation as Operation | undefined

  if (!operation) {
    return { status: "failed", output: "operation is required" }
  }

  const { type, path, diff } = operation

  if (!path) {
    return { status: "failed", output: "operation.path is required" }
  }

  let result: ApplyPatchResult

  switch (type) {
    case "create_file":
      if (!diff) return { status: "failed", output: "diff is required for create_file" }
      result = handleCreateFile(path, diff)
      break

    case "update_file":
      if (!diff) return { status: "failed", output: "diff is required for update_file" }
      result = handleUpdateFile(path, diff)
      break

    case "delete_file":
      result = handleDeleteFile(path)
      break

    default:
      return { status: "failed", output: `Unknown operation type: ${type}` }
  }

  if (result.status === "completed" && deps.project?.id) {
    persistToServer(deps.project.id, operation)
  }

  return result
}
