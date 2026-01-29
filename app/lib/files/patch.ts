import { applyDiff, generateDiff } from "~/lib/diff"
import { repairJsonNewlines } from "~/lib/json"
import { parseCodeBlocks } from "~/domain/blocks"
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
  | { path: string; status: "ok"; content: string; generatedIds?: UuidMapping }
  | { path: string; status: "error"; error: string; blockErrors?: ValidationError[] }

export type MultiPatchResult = {
  results: FileResult[]
}

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
  // Empty file creation (touch) - no validation needed
  if (content === "" && patch === "") {
    return { path, status: "ok", content: "" }
  }

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

export const applyFilePatch = (path: string, content: string, patch: string): FileResult =>
  isMdFile(path)
    ? applyMdPatch(path, content, patch)
    : { path, status: "error", error: `only .md files allowed: ${path}` }

export type FilePatch = {
  path: string
  content: string
  patch: string
}

export const applyFilePatches = (patches: FilePatch[]): MultiPatchResult => ({
  results: patches.map(({ path, content, patch }) => applyFilePatch(path, content, patch)),
})

// Re-export for convenience
export { applyDiff as applyPatch } from "~/lib/diff"
export { generateDiff as computeJsonDiff } from "~/lib/diff"
