import type { ToolCall, ToolResult, Operation, Handler } from "../types"
import { getFilesStripped, getFileRaw, updateFileRaw, deleteFile, renameFile, applyFilePatch, formatGeneratedIds } from "~/lib/files"
import { replaceUuidPlaceholders } from "~/domain/blocks"
import { toExtraPretty } from "~/lib/json"
import type { ToolExecutor } from "../turn"
import { pushEntries, diffFileContent, fileCreatedEntry, fileDeletedEntry, fileRenamedEntry } from "~/lib/mutation-history"

export const extractFiles = (): Map<string, string> =>
  new Map(Object.entries(getFilesStripped()).map(([k, v]) => [k, toExtraPretty(v)]))

type ResolvedOp = { op: Operation; placeholderIds: Record<string, string> }

export const resolveOpPlaceholders = (op: Operation): ResolvedOp => {
  if (!("diff" in op)) return { op, placeholderIds: {} }
  const { result, generated } = replaceUuidPlaceholders(op.diff)
  return { op: { ...op, diff: result }, placeholderIds: generated }
}

type PatchOptions = { skipImmutableCheck?: boolean; placeholderIds?: Record<string, string> }

type MutationOk = { ids: string | null }
type MutationErr = { error: string }
type MutationResult = MutationOk | MutationErr

const isMutationError = (r: MutationResult): r is MutationErr => "error" in r

const applyPatchAndStore = (path: string, content: string, diff: string, options: PatchOptions): MutationResult => {
  const result = applyFilePatch(path, content, diff, { ...options, actor: "ai" })
  if (result.status === "error") return { error: result.error }
  updateFileRaw(result.path, result.content)
  const ids = result.generatedIds ? formatGeneratedIds(result.generatedIds) : null
  return { ids }
}

export const applyMutation = (op: Operation, placeholderIds: Record<string, string>): MutationResult => {
  const ts = Date.now()
  switch (op.type) {
    case "create_file": {
      if (getFileRaw(op.path)) return { error: `${op.path}: already exists. Use update_file to modify it` }
      const result = applyPatchAndStore(op.path, "", op.diff, { placeholderIds })
      if (!isMutationError(result)) {
        const newContent = getFileRaw(op.path) ?? ""
        pushEntries([fileCreatedEntry(op.path, ts), ...diffFileContent("", newContent, op.path, ts)])
      }
      return result
    }
    case "update_file": {
      const oldContent = getFileRaw(op.path)
      if (!oldContent) return { error: `${op.path}: No such file` }
      const result = applyPatchAndStore(op.path, oldContent, op.diff, {
        skipImmutableCheck: op.skipImmutableCheck,
        placeholderIds,
      })
      if (!isMutationError(result)) {
        const newContent = getFileRaw(op.path) ?? ""
        pushEntries(diffFileContent(oldContent, newContent, op.path, ts))
      }
      return result
    }
    case "delete_file": {
      const oldContent = getFileRaw(op.path)
      if (!oldContent) return { error: `${op.path}: No such file` }
      pushEntries([...diffFileContent(oldContent, "", op.path, ts), fileDeletedEntry(op.path, ts)])
      deleteFile(op.path)
      return { ids: null }
    }
    case "rename_file": {
      if (!getFileRaw(op.path)) return { error: `${op.path}: No such file` }
      if (getFileRaw(op.newPath)) return { error: `${op.newPath}: already exists` }
      renameFile(op.path, op.newPath)
      pushEntries([fileRenamedEntry(op.path, op.newPath, ts)])
      return { ids: null }
    }
  }
}

export const applyMutations = (mutations: Operation[]): MutationErr | MutationOk | null => {
  if (mutations.length === 0) return null
  const allIds: string[] = []
  for (const op of mutations) {
    const { op: resolved, placeholderIds } = resolveOpPlaceholders(op)
    const result = applyMutation(resolved, placeholderIds)
    if (isMutationError(result)) return result
    if (result.ids) allIds.push(result.ids)
  }
  return { ids: allIds.length > 0 ? allIds.join("\n") : null }
}

const appendIds = (output: unknown, ids: string | null): unknown =>
  ids && typeof output === "string" ? `${output}\n${ids}` : output

export const createExecutor = (handlers: Record<string, Handler>): ToolExecutor =>
  async (call: ToolCall): Promise<ToolResult<unknown>> => {
    const handler = handlers[call.name]
    if (!handler) return { status: "error", output: `Unknown tool: ${call.name}` }

    const files = extractFiles()
    const { status, output, message, mutations } = await handler(files, call.args)

    const mutResult = applyMutations(mutations)
    if (mutResult && isMutationError(mutResult)) return { status: "error", output: mutResult.error }

    const finalOutput = appendIds(output, mutResult?.ids ?? null)
    return { status, output: finalOutput, message } as ToolResult<unknown>
  }
