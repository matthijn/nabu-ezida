import { z } from "zod"
import type { Operation } from "../types"
import { tool, registerTool, ok, err } from "./tool"

const CreateFileOp = z.object({
  type: z.literal("create_file").describe("Create a new file"),
  path: z.string().min(1).describe("Path of the file to create"),
  diff: z.string().min(1).describe("Content to write (unified diff format or raw content prefixed with '*** Add File:')"),
})

const UpdateFileOp = z.object({
  type: z.literal("update_file").describe("Update an existing file"),
  path: z.string().min(1).describe("Path of the file to update"),
  diff: z.string().min(1).describe("Changes to apply in unified diff format"),
})

const DeleteFileOp = z.object({
  type: z.literal("delete_file").describe("Delete a file"),
  path: z.string().min(1).describe("Path of the file to delete"),
})

const RenameFileOp = z.object({
  type: z.literal("rename_file").describe("Rename/move a file"),
  path: z.string().min(1).describe("Current path of the file"),
  newPath: z.string().min(1).describe("New path for the file"),
})

const OperationSchema = z.discriminatedUnion("type", [CreateFileOp, UpdateFileOp, DeleteFileOp, RenameFileOp])

const PatchArgs = z.object({
  operation: OperationSchema.describe("The file operation to perform"),
})

export const applyLocalPatch = registerTool(
  tool({
    name: "apply_local_patch",
    description: `Apply file operations to the local filesystem.

Supports four operation types:
- **create_file**: Create a new file with content
- **update_file**: Apply a unified diff to an existing file
- **delete_file**: Remove a file
- **rename_file**: Move/rename a file

For create_file and update_file, the diff should be in unified diff format or prefixed with '*** Add File:' for new files.`,
    schema: PatchArgs,
    handler: async (files, { operation }) => {
      const validationError = validateOperation(files, operation)
      if (validationError) return err(validationError)

      return ok(formatSuccess(operation), [operation])
    },
  })
)

export const patchHandler = applyLocalPatch.handle

const validateOperation = (files: Map<string, string>, op: Operation): string | null => {
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
  op.type === "rename_file" ? `Renamed ${op.path} → ${op.newPath}` : `${operationVerb[op.type]} ${op.path}`
