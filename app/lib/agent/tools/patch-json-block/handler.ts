import { z } from "zod"
import { tool, registerTool, ok, partial, err } from "../../executors/tool"
import { patchJsonBlock as def } from "./def"
import {
  findSingletonBlock,
  findBlockById,
  summarizeBlocks,
  parseBlockJson,
  replaceBlock,
  replaceSingletonBlock,
  type CodeBlock,
} from "~/lib/data-blocks/parse"
import type { JsonPatchOp } from "~/lib/patch/structured-json/apply"
import { applyEnrichedOps } from "~/lib/patch/structured-json/pipeline"
import {
  getBlockConfig,
  isKnownBlockType,
  isSingleton,
  getLabelKey,
  getFuzzyFields,
} from "~/lib/data-blocks/registry"
import { getFile } from "~/lib/files"

const normalizeDoubleExt = (path: string): string => path.replace(/(\.\w+)\1+$/, "$1")

interface ResolvedFile {
  content: string
  path: string
}

const resolveFile = (path: string): ResolvedFile | null => {
  const exact = getFile(path)
  if (exact !== undefined) return { content: exact, path }

  const normalized = normalizeDoubleExt(path)
  if (normalized !== path) {
    const content = getFile(normalized)
    if (content !== undefined) return { content, path: normalized }
  }

  return null
}

type JsonSchemaObj = Record<string, unknown> & { properties?: Record<string, { type?: string }> }

const schemaArrayFields = (language: string): Set<string> | null => {
  const config = getBlockConfig(language)
  if (!config) return null
  const schema = z.toJSONSchema(config.schema(), { io: "input" }) as JsonSchemaObj
  if (!schema.properties) return new Set()
  return new Set(
    Object.entries(schema.properties)
      .filter(([, prop]) => prop.type === "array")
      .map(([key]) => key)
  )
}

const appendTargets = (ops: JsonPatchOp[]): string[] => [
  ...new Set(
    ops.filter((op) => op.path.endsWith("/-")).map((op) => op.path.split("/").filter(Boolean)[0])
  ),
]

const seedAppendArrays = (
  ops: JsonPatchOp[],
  validFields: Set<string>
): Record<string, unknown> => {
  const doc: Record<string, unknown> = {}
  for (const field of appendTargets(ops)) {
    if (validFields.has(field)) doc[field] = []
  }
  return doc
}

const formatJson = (obj: object): string => JSON.stringify(obj, null, "\t")

const formatBlockList = (summaries: { id: string; label: string | undefined }[]): string =>
  summaries.map((s) => (s.label ? `  ${s.id} (${s.label})` : `  ${s.id}`)).join("\n")

type ResolvedBlock =
  | { ok: true; json: unknown; block: CodeBlock | null }
  | { ok: false; error: string }

interface ResolveBlockArgs {
  content: string
  language: string
  blockId: string | undefined
  operations: JsonPatchOp[]
}

const isMultiBlockLanguage = (language: string): boolean =>
  isKnownBlockType(language) && !isSingleton(language)

const resolveBlock = ({
  content,
  language,
  blockId,
  operations,
}: ResolveBlockArgs): ResolvedBlock => {
  if (!isMultiBlockLanguage(language)) {
    const block = findSingletonBlock(content, language)
    if (block) {
      const parsed = parseBlockJson(block)
      if (!parsed.ok)
        return {
          ok: false,
          error: `Failed to parse JSON in \`${language}\` block: ${parsed.error}\n---\n${parsed.raw}`,
        }
      return { ok: true, json: parsed.data, block }
    }
    const validFields = schemaArrayFields(language)
    if (!validFields) return { ok: false, error: `No \`${language}\` block found` }
    return { ok: true, json: seedAppendArrays(operations, validFields), block: null }
  }

  if (!blockId) {
    const summaries = summarizeBlocks(content, language, getLabelKey(language))
    if (summaries.length === 0)
      return { ok: false, error: `No \`${language}\` blocks found in this file` }
    return {
      ok: false,
      error: `block_id is required for \`${language}\`. Available blocks:\n${formatBlockList(summaries)}`,
    }
  }

  const found = findBlockById(content, language, blockId)
  if (!found) {
    const summaries = summarizeBlocks(content, language, getLabelKey(language))
    const available =
      summaries.length > 0
        ? `Available blocks:\n${formatBlockList(summaries)}`
        : `No \`${language}\` blocks found in this file`
    return { ok: false, error: `No \`${language}\` block with id "${blockId}". ${available}` }
  }

  return { ok: true, json: found.data, block: found.block }
}

const writeBack = (
  content: string,
  language: string,
  block: CodeBlock | null,
  newJson: string
): string =>
  block ? replaceBlock(content, block, newJson) : replaceSingletonBlock(content, language, newJson)

const CHART_GUIDANCE_KEY = "qual-coding/project/output"

const requiresGuidance = (_files: Map<string, string>, args: { language: string }): string[] =>
  args.language === "json-chart" ? [CHART_GUIDANCE_KEY] : []

export const patchJsonBlock = registerTool(
  tool({
    ...def,
    requiresGuidance,
    handler: async (_files, { path, language, block_id, operations }) => {
      const file = resolveFile(path)
      if (!file) return err(`${path}: No such file`)

      const resolved = resolveBlock({
        content: file.content,
        language,
        blockId: block_id,
        operations,
      })
      if (!resolved.ok) return err(`${file.path}: ${resolved.error}`)

      const fuzzyFields = getFuzzyFields(language)
      const {
        doc: patchedDoc,
        failures,
        applied,
        rejectedPaths,
      } = applyEnrichedOps(operations, resolved.json, file.content, { fuzzyFields })

      const rejectedMessage =
        rejectedPaths.length > 0
          ? `Rejected ${rejectedPaths.length} op(s) with numeric indices (use selectors instead): ${rejectedPaths.join(", ")}`
          : ""

      if (applied === 0) {
        return err(
          rejectedPaths.length > 0 && failures.length === 0
            ? `All operations use numeric array indices. Use selectors instead, e.g. /annotations[id=annotation_abc]`
            : [rejectedMessage, ...failures].filter(Boolean).join("\n")
        )
      }

      const newRaw = writeBack(
        file.content,
        language,
        resolved.block,
        formatJson(patchedDoc as object)
      )
      const isNoOp = newRaw === file.content

      const successOutput = isNoOp
        ? `${file.path}: No changes`
        : `Patched \`${language}\` block in ${file.path}`

      const mutations = isNoOp
        ? []
        : [{ type: "write_file" as const, path: file.path, content: newRaw }]

      const allFailures = [rejectedMessage, ...failures].filter(Boolean)

      return allFailures.length > 0
        ? partial(successOutput, allFailures.join("\n"), mutations)
        : ok(successOutput, mutations)
    },
  })
)
