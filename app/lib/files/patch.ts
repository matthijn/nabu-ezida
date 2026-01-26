import { applyDiff, generateDiff } from "~/lib/diff"
import { parseJson, repairJsonNewlines } from "~/lib/json"
import { parseCodeBlocks } from "~/domain/blocks"
import {
  validateFieldChanges,
  validateFieldChangesInternal,
  type FieldRejection,
  type DocumentMetaType,
} from "~/domain/attributes"
import {
  replaceUuidPlaceholders,
  validateMarkdownBlocks,
  extractProse,
  type UuidMapping,
  type ValidationContext,
  type ValidationError,
} from "~/domain/blocks"
import { getAllCodes } from "./store"

export type FileResult =
  | { path: string; status: "ok"; content: string; parsed?: DocumentMetaType; generatedIds?: UuidMapping }
  | { path: string; status: "partial"; content: string; parsed: DocumentMetaType; rejected: FieldRejection[] }
  | { path: string; status: "error"; error: string; blockErrors?: ValidationError[] }

export type MultiPatchResult = {
  results: FileResult[]
}

export type PatchOptions = {
  internal?: boolean
}

const isJsonFile = (path: string): boolean => path.endsWith(".json")
const isMdFile = (path: string): boolean => path.endsWith(".md")
const isJsonBlock = (language: string): boolean => language.startsWith("json")

const repairJsonBlocks = (markdown: string): string => {
  const blocks = parseCodeBlocks(markdown).filter((b) => isJsonBlock(b.language))
  if (blocks.length === 0) return markdown

  let result = markdown
  let offset = 0

  for (const block of blocks) {
    const repaired = repairJsonNewlines(block.content)
    if (repaired === block.content) continue

    const blockStart = block.start + offset
    const blockEnd = block.end + offset
    const original = result.slice(blockStart, blockEnd)
    const replaced = original.replace(block.content, repaired)

    result = result.slice(0, blockStart) + replaced + result.slice(blockEnd)
    offset += replaced.length - original.length
  }

  return result
}

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

const buildValidationContext = (markdown: string): ValidationContext => ({
  documentProse: extractProse(markdown),
  availableCodes: getAllCodes().map((c) => ({ id: c.id, name: c.title })),
})

const formatBlockErrors = (errors: ValidationError[]): string =>
  errors.map((e) => {
    const location = e.field ? `${e.block}.${e.field}` : e.block
    const hint = e.hint ? ` Available: ${JSON.stringify(e.hint)}` : ""
    const current = e.currentBlock ? `\nCurrent block:\n${e.currentBlock}` : ""
    return `${location}: ${e.message}${hint}${current}`
  }).join("\n")

const applyMdPatch = (path: string, content: string, patch: string): FileResult => {
  const { result: patchWithIds, generated } = replaceUuidPlaceholders(patch)

  const diffResult = applyDiff(content, patchWithIds)
  if (!diffResult.ok) {
    return { path, status: "error", error: diffResult.error }
  }

  const repairedContent = repairJsonBlocks(diffResult.content)
  const context = buildValidationContext(repairedContent)
  const validation = validateMarkdownBlocks(repairedContent, { context, original: content })

  if (!validation.valid) {
    return {
      path,
      status: "error",
      error: formatBlockErrors(validation.errors),
      blockErrors: validation.errors,
    }
  }

  const hasGeneratedIds = Object.keys(generated).length > 0

  return {
    path,
    status: "ok",
    content: repairedContent,
    ...(hasGeneratedIds && { generatedIds: generated }),
  }
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
