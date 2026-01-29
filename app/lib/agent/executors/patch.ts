import { z } from "zod"
import type { Handler, ToolDeps, ToolResult } from "../types"
import { getFileRaw, updateFileRaw, deleteFile, renameFile, applyFilePatch, type FileResult } from "~/lib/files"
import { sendCommand, type Command, type Action } from "~/lib/sync"

export const applyPatchTool: Handler<string> = async (deps: ToolDeps, args) => {
  if (!args.operation) {
    return { status: "error", output: "operation required - provide {type: 'create_file'|'update_file'|'delete_file'|'rename_file', path, diff}" }
  }

  const parsed = ApplyPatchArgs.safeParse(args)
  if (!parsed.success) return formatZodError(parsed.error)

  const operation = parsed.data.operation
  const result = applyOperation(operation)

  if (result.status === "ok" && deps.project?.id) {
    persistToServer(deps.project.id, operation)
  }

  return result
}

export const applyOperation = (operation: Operation): ToolResult<string> => {
  switch (operation.type) {
    case "create_file":
      return handleCreateFile(operation.path, operation.diff)
    case "update_file":
      return handleUpdateFile(operation.path, operation.diff)
    case "delete_file":
      return handleDeleteFile(operation.path)
    case "rename_file":
      return handleRenameFile(operation.oldPath, operation.newPath)
  }
}

const CreateFileOp = z.object({
  type: z.literal("create_file"),
  path: z.string().min(1, "path required - which file to create?"),
  diff: z.string().min(1, "diff required - what content to write?"),
})

const UpdateFileOp = z.object({
  type: z.literal("update_file"),
  path: z.string().min(1, "path required - which file to update?"),
  diff: z.string().min(1, "diff required - what changes to apply?"),
})

const DeleteFileOp = z.object({
  type: z.literal("delete_file"),
  path: z.string().min(1, "path required - which file to delete?"),
})

const RenameFileOp = z.object({
  type: z.literal("rename_file"),
  oldPath: z.string().min(1, "oldPath required - which file to rename?"),
  newPath: z.string().min(1, "newPath required - what to rename it to?"),
})

const OperationSchema = z.discriminatedUnion("type", [CreateFileOp, UpdateFileOp, DeleteFileOp, RenameFileOp])

const ApplyPatchArgs = z.object({
  operation: OperationSchema,
})

export type Operation = z.infer<typeof OperationSchema>

const formatZodError = (error: z.ZodError): ToolResult<string> => ({
  status: "error",
  output: error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", "),
})

const handleCreateFile = (path: string, diff: string): ToolResult<string> => {
  if (getFileRaw(path)) {
    return { status: "error", output: `${path}: already exists` }
  }
  return toToolResult(applyFilePatch(path, "", diff), "Created")
}

const handleUpdateFile = (path: string, diff: string): ToolResult<string> => {
  const content = getFileRaw(path)
  if (!content) {
    return { status: "error", output: `${path}: No such file` }
  }
  return toToolResult(applyFilePatch(path, content, diff), "Updated")
}

const handleDeleteFile = (path: string): ToolResult<string> => {
  if (!getFileRaw(path)) {
    return { status: "error", output: `${path}: No such file` }
  }
  deleteFile(path)
  return { status: "ok", output: `Deleted ${path}` }
}

const handleRenameFile = (oldPath: string, newPath: string): ToolResult<string> => {
  if (!getFileRaw(oldPath)) {
    return { status: "error", output: `${oldPath}: No such file` }
  }
  if (getFileRaw(newPath)) {
    return { status: "error", output: `${newPath}: already exists` }
  }
  renameFile(oldPath, newPath)
  return { status: "ok", output: `Renamed ${oldPath} → ${newPath}` }
}

const toToolResult = (result: FileResult, verb: string): ToolResult<string> => {
  if (result.status === "error") {
    return { status: "error", output: result.error }
  }
  updateFileRaw(result.path, result.content)
  return { status: "ok", output: `${verb} ${result.path}` }
}

const operationTypeToAction: Record<Operation["type"], Action> = {
  create_file: "CreateFile",
  update_file: "UpdateFile",
  delete_file: "DeleteFile",
  rename_file: "RenameFile",
}

const persistToServer = (projectId: string, operation: Operation): void => {
  const command: Command =
    operation.type === "rename_file"
      ? { action: "RenameFile", path: operation.oldPath, newPath: operation.newPath }
      : { action: operationTypeToAction[operation.type], path: operation.path, diff: "diff" in operation ? operation.diff : undefined }
  sendCommand(projectId, command).catch(() => {})
}
