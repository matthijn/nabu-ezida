import type { Operation } from "../../types"
import { tool, registerTool, ok, err } from "../tool"
import { applyLocalPatch as def } from "./apply-local-patch.def"

export const applyLocalPatch = registerTool(
  tool({
    ...def,
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
      return files.has(op.path) ? `${op.path}: already exists. Use update_file to modify it` : null
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
