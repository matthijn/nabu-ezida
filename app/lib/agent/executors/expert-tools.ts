import { z } from "zod"
import { tool, registerTool, ok, err, toToolDefinition } from "./tool"
import type { ToolDefinition } from "./tool"
import type { RawFiles, HandlerResult } from "../types"
import type { StoredAnnotation } from "~/domain/attributes/schema"
import { extractProse } from "~/domain/blocks/validate"
import { findSingletonBlock, parseBlockJson } from "~/domain/blocks/parse"
import { generateJsonBlockPatch } from "~/lib/diff/json-block/patch"
import { patchJsonBlock } from "./json-patch"
import { applyLocalPatch } from "./patch"

const ATTRIBUTES_LANG = "json-attributes"

export const expertToolDefinitions: ToolDefinition[] = []

const wrapFuzzy = (text: string): string => `FUZZY[[${text}]]`

const confidenceToAmbiguity = (
  confidence: "high" | "medium" | "low",
  ambiguity?: string
): StoredAnnotation["ambiguity"] => {
  if (confidence === "high") return undefined
  return { description: ambiguity ?? "Confidence below high", confidence }
}

const getDocProse = (files: RawFiles, path: string): string | null => {
  const content = files.get(path)
  return content ? extractProse(content) : null
}

const getExistingAnnotations = (files: RawFiles, path: string): StoredAnnotation[] => {
  const content = files.get(path)
  if (!content) return []
  const block = findSingletonBlock(content, ATTRIBUTES_LANG)
  if (!block) return []
  const meta = parseBlockJson<{ annotations?: StoredAnnotation[] }>(block)
  return meta?.annotations ?? []
}

const hasAttributesBlock = (files: RawFiles, path: string): boolean => {
  const content = files.get(path)
  return content ? !!findSingletonBlock(content, ATTRIBUTES_LANG) : false
}

const createBlockWithAnnotation = (files: RawFiles, path: string, annotation: StoredAnnotation): HandlerResult<string> => {
  const content = files.get(path)!
  const newMeta = { annotations: [annotation] }
  const diffResult = generateJsonBlockPatch(content, ATTRIBUTES_LANG, newMeta)
  if (!diffResult.ok) return err(`Failed to create attributes block: ${diffResult.error}`)
  if (!diffResult.patch) return ok(`${path}: No changes`)
  return ok(`Created annotation in ${path}`, [{ type: "update_file", path, diff: diffResult.patch, skipImmutableCheck: true }])
}

const AddAnnotationArgs = z.object({
  path: z.string().min(1).describe("File path of the document to annotate"),
  text: z.string().describe("Exact text from the document being annotated"),
  code: z.string().describe("The code's ID (e.g. callout_abc123), NOT its name or title"),
  reason: z.string().describe("Why this code applies — user-facing, include code name"),
  confidence: z.enum(["high", "medium", "low"]).describe("Confidence level"),
  ambiguity: z.string().optional().describe("If confidence < high, what the user should weigh in on"),
})

const MarkForDeletionArgs = z.object({
  path: z.string().min(1).describe("File path of the document"),
  id: z.string().describe("The annotation's ID (e.g. annotation_abc12345)"),
  reason: z.string().describe("Why this annotation should be removed"),
})

const SummarizeExpertiseArgs = z.object({
  orchestrator_summary: z.string().describe("Technical summary for the orchestrator (patterns, gaps, notes)"),
  display_summary: z.string().describe("User-facing summary of what was found"),
})

export const addAnnotation = registerTool(
  tool({
    name: "add_annotation",
    description: "Add a new annotation to a document.",
    schema: AddAnnotationArgs,
    handler: async (files, { path, text, code, reason, confidence, ambiguity }): Promise<HandlerResult<string>> => {
      const prose = getDocProse(files, path)
      if (!prose) return err(`${path}: No such file or no prose`)

      const resolvedAmbiguity = confidenceToAmbiguity(confidence, ambiguity)
      const annotation: StoredAnnotation = {
        text: wrapFuzzy(text),
        color: undefined,
        code,
        reason,
        ...(resolvedAmbiguity && { ambiguity: resolvedAmbiguity }),
        pending: "pending_change",
      }
      const patchValue = JSON.parse(JSON.stringify(annotation))

      if (!hasAttributesBlock(files, path)) {
        return createBlockWithAnnotation(files, path, annotation)
      }

      const existing = getExistingAnnotations(files, path)
      const addPath = existing.length > 0 ? "/annotations/-" : "/annotations"
      const value = existing.length > 0 ? patchValue : [patchValue]

      return patchJsonBlock.handle(files, {
        path,
        language: ATTRIBUTES_LANG,
        operations: [{ op: "add", path: addPath, value }],
      })
    },
  })
)

export const markForDeletion = registerTool(
  tool({
    name: "mark_for_deletion",
    description: "Mark an existing annotation for deletion by its ID.",
    schema: MarkForDeletionArgs,
    handler: async (files, { path, id, reason }): Promise<HandlerResult<string>> => {
      const annotations = getExistingAnnotations(files, path)
      const index = annotations.findIndex((a) => a.id === id)
      if (index < 0) return err(`No annotation found with ID: "${id}"`)

      return patchJsonBlock.handle(files, {
        path,
        language: ATTRIBUTES_LANG,
        operations: [
          { op: "add", path: `/annotations/${index}/pending`, value: "pending_deletion" },
          { op: "replace", path: `/annotations/${index}/reason`, value: reason },
        ],
      })
    },
  })
)

export const summarizeExpertise = registerTool(
  tool({
    name: "summarize_expertise",
    description: "Provide a summary of the analysis. Call this last, after all annotations. This is the only output the orchestrator sees.",
    schema: SummarizeExpertiseArgs,
    handler: async (_files, { orchestrator_summary, display_summary }) =>
      ok({ orchestrator_summary, display_summary }),
  })
)

expertToolDefinitions.push(
  toToolDefinition(addAnnotation),
  toToolDefinition(markForDeletion),
  toToolDefinition(summarizeExpertise),
)

export const reviseCodebookToolDefinitions: ToolDefinition[] = [
  toToolDefinition(patchJsonBlock),
  toToolDefinition(applyLocalPatch),
  toToolDefinition(summarizeExpertise),
]
