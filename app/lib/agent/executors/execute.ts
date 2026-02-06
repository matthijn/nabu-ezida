import type { ToolCall, ToolResult, Operation, Handler } from "../types"
import { getFilesStripped, getFileRaw, updateFileRaw, deleteFile, renameFile, applyFilePatch, formatGeneratedIds } from "~/lib/files"
import { replaceUuidPlaceholders } from "~/domain/blocks"
import { toExtraPretty } from "~/lib/json"
import type { ToolExecutor } from "../turn"

export const extractFiles = (): Map<string, string> =>
  new Map(Object.entries(getFilesStripped()).map(([k, v]) => [k, toExtraPretty(v)]))

type ResolvedOp = { op: Operation; placeholderIds: Record<string, string> }

export const resolveOpPlaceholders = (op: Operation): ResolvedOp => {
  if (!("diff" in op)) return { op, placeholderIds: {} }
  const { result, generated } = replaceUuidPlaceholders(op.diff)
  return { op: { ...op, diff: result }, placeholderIds: generated }
}

type PatchOptions = { skipImmutableCheck?: boolean; placeholderIds?: Record<string, string> }

const applyPatchAndStore = (path: string, content: string, diff: string, verb: string, options: PatchOptions): ToolResult<string> => {
  const result = applyFilePatch(path, content, diff, options)
  if (result.status === "error") return { status: "error", output: result.error }
  updateFileRaw(result.path, result.content)

  const idsSummary = result.generatedIds ? formatGeneratedIds(result.generatedIds) : ""
  const output = idsSummary ? `${verb} ${result.path}\n${idsSummary}` : `${verb} ${result.path}`

  return { status: "ok", output }
}

export const applyMutation = (op: Operation, placeholderIds: Record<string, string>): ToolResult<string> => {
  switch (op.type) {
    case "create_file": {
      if (getFileRaw(op.path)) return { status: "error", output: `${op.path}: already exists` }
      return applyPatchAndStore(op.path, "", op.diff, "Created", { placeholderIds })
    }
    case "update_file": {
      const content = getFileRaw(op.path)
      if (!content) return { status: "error", output: `${op.path}: No such file` }
      return applyPatchAndStore(op.path, content, op.diff, "Updated", {
        skipImmutableCheck: op.skipImmutableCheck,
        placeholderIds,
      })
    }
    case "delete_file": {
      if (!getFileRaw(op.path)) return { status: "error", output: `${op.path}: No such file` }
      deleteFile(op.path)
      return { status: "ok", output: `Deleted ${op.path}` }
    }
    case "rename_file": {
      if (!getFileRaw(op.path)) return { status: "error", output: `${op.path}: No such file` }
      if (getFileRaw(op.newPath)) return { status: "error", output: `${op.newPath}: already exists` }
      renameFile(op.path, op.newPath)
      return { status: "ok", output: `Renamed ${op.path} → ${op.newPath}` }
    }
  }
}

export const applyMutations = (mutations: Operation[]): ToolResult<string> | null => {
  const outputs: string[] = []
  for (const op of mutations) {
    const { op: resolved, placeholderIds } = resolveOpPlaceholders(op)
    const result = applyMutation(resolved, placeholderIds)
    if (result.status === "error") return result
    outputs.push(result.output)
  }
  return outputs.length > 0 ? { status: "ok", output: outputs.join("\n") } : null
}

export const createExecutor = (handlers: Record<string, Handler>): ToolExecutor =>
  async (call: ToolCall): Promise<ToolResult<unknown>> => {
    const handler = handlers[call.name]
    if (!handler) return { status: "error", output: `Unknown tool: ${call.name}` }

    const files = extractFiles()
    const { status, output, mutations } = await handler(files, call.args)

    const mutResult = applyMutations(mutations)
    if (mutResult?.status === "error") return mutResult

    const finalOutput = mutResult?.output ?? output
    return { status, output: finalOutput } as ToolResult<unknown>
  }
