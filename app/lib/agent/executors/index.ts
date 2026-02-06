import type { ToolCall, ToolDeps, ToolResult, Operation } from "../types"
import { getFilesStripped, getFileRaw, updateFileRaw, deleteFile, renameFile, applyFilePatch, formatGeneratedIds } from "~/lib/files"
import { sendCommand, type Command } from "~/lib/sync"
import { getToolHandlers, getToolDefinitions } from "./tool"
import { replaceUuidPlaceholders } from "~/domain/blocks"
import { toExtraPretty } from "~/lib/json"

// Import tools to register them
import "./patch"
import "./orchestration"
import "./shell"
import "./ask-expert"
import "./json-patch"
import "./remove-block"

export type { ToolDeps }
export { getToolDefinitions }

export const createToolExecutor = (deps: ToolDeps) => async (call: ToolCall): Promise<ToolResult<unknown>> => {
  const handlers = getToolHandlers()
  const handler = handlers[call.name]
  if (!handler) {
    return { status: "error", output: `Unknown tool: ${call.name}` }
  }

  const files = extractFiles()
  const { status, output, mutations } = await handler(files, call.args)

  const mutationOutputs: string[] = []
  for (const op of mutations) {
    const { op: resolved, placeholderIds } = resolveOpPlaceholders(op)
    const result = applyMutation(resolved, placeholderIds)
    if (result.status === "error") {
      return result
    }
    mutationOutputs.push(result.output)
    if (deps.project?.id) {
      persistToServer(deps.project.id, resolved)
    }
  }

  const finalOutput = mutationOutputs.length > 0 ? mutationOutputs.join("\n") : output
  return { status, output: finalOutput } as ToolResult<unknown>
}

const extractFiles = (): Map<string, string> =>
  new Map(Object.entries(getFilesStripped()).map(([k, v]) => [k, toExtraPretty(v)]))

type ResolvedOp = { op: Operation; placeholderIds: Record<string, string> }

const resolveOpPlaceholders = (op: Operation): ResolvedOp => {
  if (!("diff" in op)) return { op, placeholderIds: {} }
  const { result, generated } = replaceUuidPlaceholders(op.diff)
  return { op: { ...op, diff: result }, placeholderIds: generated }
}

const applyMutation = (op: Operation, placeholderIds: Record<string, string>): ToolResult<string> => {
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

type PatchOptions = { skipImmutableCheck?: boolean; placeholderIds?: Record<string, string> }

const applyPatchAndStore = (path: string, content: string, diff: string, verb: string, options: PatchOptions): ToolResult<string> => {
  const result = applyFilePatch(path, content, diff, options)
  if (result.status === "error") return { status: "error", output: result.error }
  updateFileRaw(result.path, result.content)

  const idsSummary = result.generatedIds ? formatGeneratedIds(result.generatedIds) : ""
  const output = idsSummary ? `${verb} ${result.path}\n${idsSummary}` : `${verb} ${result.path}`

  return { status: "ok", output }
}

const toCommand = (op: Operation): Command => {
  switch (op.type) {
    case "create_file":
    case "update_file":
      return { action: "WriteFile", path: op.path, content: getFileRaw(op.path) }
    case "delete_file":
      return { action: "DeleteFile", path: op.path }
    case "rename_file":
      return { action: "RenameFile", path: op.path, newPath: op.newPath }
  }
}

const persistToServer = (projectId: string, op: Operation): void => {
  sendCommand(projectId, toCommand(op)).catch(() => {})
}
