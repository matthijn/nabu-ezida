import { applyDiff, generateDiff } from "~/lib/diff"
import { parseJson } from "~/lib/json"
import {
  validateFieldChanges,
  validateFieldChangesInternal,
  type FieldRejection,
  type DocumentMetaType,
} from "~/domain/sidecar"

export type FileResult =
  | { path: string; status: "ok"; content: string; parsed?: DocumentMetaType }
  | { path: string; status: "partial"; content: string; parsed: DocumentMetaType; rejected: FieldRejection[] }
  | { path: string; status: "error"; error: string }

export type MultiPatchResult = {
  results: FileResult[]
}

export type PatchOptions = {
  internal?: boolean
}

const isJsonFile = (path: string): boolean => path.endsWith(".json")

const applyJsonPatch = (
  path: string,
  content: string,
  patch: string,
  options: PatchOptions
): FileResult => {
  const diffResult = applyDiff(content, patch)
  if (!diffResult.ok) {
    return { path, status: "error", error: diffResult.error }
  }

  const parseResult = parseJson(diffResult.content)
  if (!parseResult.ok) {
    return { path, status: "error", error: parseResult.error }
  }

  const originalParsed = content ? parseJson(content) : { ok: true as const, data: {} }
  if (!originalParsed.ok) {
    return { path, status: "error", error: `Failed to parse original: ${originalParsed.error}` }
  }

  const original = originalParsed.data as Record<string, unknown>
  const patched = parseResult.data as Record<string, unknown>

  const validate = options.internal ? validateFieldChangesInternal : validateFieldChanges
  const { accepted, rejected } = validate(original, patched)
  const prettyContent = JSON.stringify(accepted, null, 2)

  if (rejected.length > 0) {
    return { path, status: "partial", content: prettyContent, parsed: accepted, rejected }
  }

  return { path, status: "ok", content: prettyContent, parsed: accepted }
}

const applyMdPatch = (path: string, content: string, patch: string): FileResult => {
  const result = applyDiff(content, patch)
  if (!result.ok) {
    return { path, status: "error", error: result.error }
  }
  return { path, status: "ok", content: result.content }
}

export const applyFilePatch = (
  path: string,
  content: string,
  patch: string,
  options: PatchOptions = {}
): FileResult =>
  isJsonFile(path)
    ? applyJsonPatch(path, content, patch, options)
    : applyMdPatch(path, content, patch)

export type FilePatch = {
  path: string
  content: string
  patch: string
}

export const applyFilePatches = (
  patches: FilePatch[],
  options: PatchOptions = {}
): MultiPatchResult => ({
  results: patches.map(({ path, content, patch }) => applyFilePatch(path, content, patch, options)),
})

// Re-export for convenience
export { applyDiff as applyPatch } from "~/lib/diff"
export { generateDiff as computeJsonDiff } from "~/lib/diff"
