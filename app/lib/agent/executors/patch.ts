import { z } from "zod"
import type { Handler, HandlerResult, RawFiles, Operation } from "../types"

export const patchHandler: Handler<string> = async (files, args) => {
  if (!args.operation) {
    return {
      status: "error",
      output: "operation required - provide {type: 'create_file'|'update_file'|'delete_file'|'rename_file', path, diff}",
      mutations: [],
    }
  }

  const parsed = ApplyPatchArgs.safeParse(args)
  if (!parsed.success) return formatZodError(parsed.error)

  const operation = parsed.data.operation
  const error = validateOperation(files, operation)

  if (error) {
    return { status: "error", output: error, mutations: [] }
  }

  return {
    status: "ok",
    output: formatSuccess(operation),
    mutations: [operation],
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
  path: z.string().min(1, "path required - which file to rename?"),
  newPath: z.string().min(1, "newPath required - what to rename it to?"),
})

const OperationSchema = z.discriminatedUnion("type", [CreateFileOp, UpdateFileOp, DeleteFileOp, RenameFileOp])

const ApplyPatchArgs = z.object({
  operation: OperationSchema,
})

const formatZodError = (error: z.ZodError): HandlerResult<string> => ({
  status: "error",
  output: error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", "),
  mutations: [],
})

const validateOperation = (files: RawFiles, op: Operation): string | null => {
  switch (op.type) {
    case "create_file":
      return files.has(op.path) ? `${op.path}: already exists` : null
    case "update_file":
      return files.has(op.path) ? null : `${op.path}: No such file`
    case "delete_file":
      return files.has(op.path) ? null : `${op.path}: No such file`
    case "rename_file":
      if (!files.has(op.path)) return `${op.path}: No such file`
      if (files.has(op.newPath)) return `${op.newPath}: already exists`
      return null
  }
}

const operationVerb: Record<Operation["type"], string> = {
  create_file: "Created",
  update_file: "Updated",
  delete_file: "Deleted",
  rename_file: "Renamed",
}

const formatSuccess = (op: Operation): string =>
  op.type === "rename_file"
    ? `Renamed ${op.path} → ${op.newPath}`
    : `${operationVerb[op.type]} ${op.path}`
