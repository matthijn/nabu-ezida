import { z } from "zod"

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

export const PatchArgs = z.object({
  operation: OperationSchema.describe("The file operation to perform"),
})

export const applyLocalPatch = {
  name: "apply_local_patch" as const,
  description: "Apply file operations to the local filesystem.",
  schema: PatchArgs,
}
