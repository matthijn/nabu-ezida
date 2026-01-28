import { z } from "zod"
import type { Handler, ToolDeps } from "../types"
import { getFileRaw, updateFileRaw, deleteFile, applyFilePatch, type FileResult } from "~/lib/files"
import { sendCommand, type Command, type Action } from "~/lib/sync"
import type { FieldRejection } from "~/domain/attributes"

export const applyPatchTool: Handler = async (deps: ToolDeps, args) => {
  if (!args.operation) {
    return { status: "failed", output: "operation required - provide {type: 'create_file'|'update_file'|'delete_file', path, diff}" }
  }

  const parsed = ApplyPatchArgs.safeParse(args)
  if (!parsed.success) return formatError(parsed.error)

  const operation = parsed.data.operation
  const { type, path } = operation

  const result: ApplyPatchResult =
    type === "create_file" ? handleCreateFile(path, operation.diff) :
    type === "update_file" ? handleUpdateFile(path, operation.diff) :
    handleDeleteFile(path)

  if (result.status === "completed" && deps.project?.id) {
    persistToServer(deps.project.id, operation)
  }

  return result
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

const OperationSchema = z.discriminatedUnion("type", [CreateFileOp, UpdateFileOp, DeleteFileOp])

const ApplyPatchArgs = z.object({
  operation: OperationSchema,
})

type Operation = z.infer<typeof OperationSchema>

type ApplyPatchResult =
  | { status: "completed"; output: string }
  | { status: "failed"; output: string }

const formatError = (error: z.ZodError): { status: "failed"; output: string } => ({
  status: "failed",
  output: error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", "),
})

const handleCreateFile = (path: string, diff: string): ApplyPatchResult =>
  toApplyPatchResult(applyFilePatch(path, "", diff), "Created")

const handleUpdateFile = (path: string, diff: string): ApplyPatchResult =>
  toApplyPatchResult(applyFilePatch(path, getFileRaw(path), diff), "Updated")

const handleDeleteFile = (path: string): ApplyPatchResult => {
  deleteFile(path)
  return { status: "completed", output: `Deleted ${path}` }
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

const storeResult = (result: Extract<FileResult, { status: "ok" | "partial" }>): void => {
  updateFileRaw(result.path, result.content)
}

const formatPartialResult = (
  path: string,
  verb: string,
  rejected: FieldRejection[]
): string => {
  const rejectedText = rejected.map(formatRejection).join("; ")
  return `${verb} ${path} (partial). Rejected fields: ${rejectedText}`
}

const formatRejection = (r: FieldRejection): string =>
  r.reason === "readonly"
    ? `${r.field}: readonly - ${r.hint}`
    : `${r.field}: ${r.issues.map(i => i.message).join(", ")}`

const operationTypeToAction: Record<Operation["type"], Action> = {
  create_file: "CreateFile",
  update_file: "UpdateFile",
  delete_file: "DeleteFile",
}

const persistToServer = (projectId: string, operation: Operation): void => {
  const command: Command = {
    action: operationTypeToAction[operation.type],
    path: operation.path,
    diff: "diff" in operation ? operation.diff : undefined,
  }
  sendCommand(projectId, command).catch(() => {})
}
