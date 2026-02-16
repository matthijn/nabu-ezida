import { z } from "zod"
import { tool, registerTool, ok, err } from "./tool"
import { findSingletonBlock, parseBlockJson } from "~/domain/blocks/parse"
import type { JsonPatchOp } from "~/lib/diff/json-block/apply"
import { applyJsonPatchOps } from "~/lib/diff/json-block/apply"
import { generateJsonBlockPatch } from "~/lib/diff/json-block/patch"
import { hasFuzzyPatterns } from "~/lib/diff/fuzzy-inline"

const JsonPatchOpSchema = z.discriminatedUnion("op", [
  z.object({
    op: z.literal("add"),
    path: z.string().describe("JSON Pointer (RFC 6901) to the target location"),
    value: z.unknown().describe("Value to add"),
  }),
  z.object({
    op: z.literal("remove"),
    path: z.string().describe("JSON Pointer to the value to remove"),
  }),
  z.object({
    op: z.literal("replace"),
    path: z.string().describe("JSON Pointer to the value to replace"),
    value: z.unknown().describe("New value"),
  }),
  z.object({
    op: z.literal("move"),
    from: z.string().describe("JSON Pointer to the source location"),
    path: z.string().describe("JSON Pointer to the target location"),
  }),
  z.object({
    op: z.literal("copy"),
    from: z.string().describe("JSON Pointer to the source location"),
    path: z.string().describe("JSON Pointer to the target location"),
  }),
  z.object({
    op: z.literal("test"),
    path: z.string().describe("JSON Pointer to the value to test"),
    value: z.unknown().describe("Expected value"),
  }),
])

const PatchJsonBlockArgs = z.object({
  path: z.string().min(1).describe("File path containing the JSON block"),
  language: z.string().min(1).describe("Fenced code block language (e.g. json-attributes, json-callout)"),
  operations: z.array(JsonPatchOpSchema).min(1).describe("RFC 6902 JSON Patch operations to apply"),
})

type Selector = { arrayPath: string; key: string; value: string; rest: string }

const SELECTOR_REGEX = /^(\/[^[]+)\[([^\]=]+)=([^\]]+)\](\/.*)?$/

const parseSelector = (path: string): Selector | null => {
  const match = path.match(SELECTOR_REGEX)
  if (!match) return null
  return { arrayPath: match[1], key: match[2], value: match[3], rest: match[4] ?? "" }
}

const NUMERIC_INDEX_REGEX = /\/\d+(\/|$)/

const hasNumericIndex = (path: string): boolean =>
  NUMERIC_INDEX_REGEX.test(path)

const collectOpPaths = (op: JsonPatchOp): string[] =>
  "from" in op && op.from ? [op.path, op.from] : [op.path]

type OpPartition = { accepted: JsonPatchOp[]; rejectedPaths: string[] }

const isNumericIndexOp = (op: JsonPatchOp): boolean =>
  collectOpPaths(op).some(p => !parseSelector(p) && hasNumericIndex(p))

export const partitionNumericIndices = (ops: JsonPatchOp[]): OpPartition =>
  ops.reduce<OpPartition>(
    (acc, op) => {
      if (isNumericIndexOp(op)) {
        return { ...acc, rejectedPaths: [...acc.rejectedPaths, op.path] }
      }
      return { ...acc, accepted: [...acc.accepted, op] }
    },
    { accepted: [], rejectedPaths: [] }
  )

const getNestedValue = (obj: unknown, path: string): unknown => {
  const segments = path.split(".")
  let current: unknown = obj
  for (const seg of segments) {
    if (current === null || typeof current !== "object") return undefined
    current = (current as Record<string, unknown>)[seg]
  }
  return current
}

const findMatchingIndices = (doc: unknown, selector: Selector): number[] => {
  const segments = selector.arrayPath.split("/").filter(Boolean)
  let current: unknown = doc
  for (const seg of segments) {
    if (current === null || typeof current !== "object") return []
    current = (current as Record<string, unknown>)[seg]
  }
  if (!Array.isArray(current)) return []
  const indices: number[] = []
  for (let i = 0; i < current.length; i++) {
    if (String(getNestedValue(current[i], selector.key)) === selector.value) {
      indices.push(i)
    }
  }
  return indices
}

const expandOpWithSelector = (op: JsonPatchOp, indices: number[], selector: Selector): JsonPatchOp[] => {
  const sorted = op.op === "remove" ? [...indices].sort((a, b) => b - a) : indices
  return sorted.map((i) => ({
    ...op,
    path: `${selector.arrayPath}/${i}${selector.rest}`,
  }))
}

export type ResolveResult =
  | { ok: true; ops: JsonPatchOp[] }
  | { ok: false; error: string }

export const resolveSelectors = (ops: JsonPatchOp[], doc: unknown): ResolveResult => {
  const resolved: JsonPatchOp[] = []
  for (const op of ops) {
    const selector = parseSelector(op.path)
    if (!selector) {
      resolved.push(op)
      continue
    }
    const indices = findMatchingIndices(doc, selector)
    if (indices.length === 0) {
      return { ok: false, error: `No items match ${op.path}` }
    }
    resolved.push(...expandOpWithSelector(op, indices, selector))
  }
  return { ok: true, ops: resolved }
}

const isAnnotationPath = (path: string): boolean =>
  /\/annotations\/[^/]+$/.test(path)

const isAnnotationTextField = (path: string): boolean =>
  /\/annotations\/[^/]+\/text$/.test(path)

const hasTextField = (v: unknown): v is Record<string, unknown> & { text: string } =>
  typeof v === "object" && v !== null && "text" in v && typeof (v as Record<string, unknown>).text === "string"

const wrapFuzzy = (text: string): string => `FUZZY[[${text}]]`

export const autoFuzzyAnnotationText = (op: JsonPatchOp): JsonPatchOp => {
  if (op.op !== "add" && op.op !== "replace") return op

  if (isAnnotationPath(op.path) && hasTextField(op.value) && !hasFuzzyPatterns(op.value.text)) {
    return { ...op, value: { ...op.value, text: wrapFuzzy(op.value.text) } }
  }

  if (isAnnotationTextField(op.path) && typeof op.value === "string" && !hasFuzzyPatterns(op.value)) {
    return { ...op, value: wrapFuzzy(op.value) }
  }

  return op
}

export const patchJsonBlock = registerTool(
  tool({
    name: "patch_json_block",
    description: `Apply RFC 6902 JSON Patch operations to a fenced JSON code block within a document.

Finds the block by language identifier, applies the operations to its parsed JSON, and produces a file diff.

Supported operations: add, remove, replace, move, copy, test.
Paths use JSON Pointer syntax (RFC 6901): /field, /nested/deep/field, /array/- (append).

Array items MUST be targeted by selector: /annotations[id=annotation_8f2a] or /annotations[ambiguity.confidence=medium]. Numeric indices (/annotations/0) are not allowed — always use a selector. Selectors match all items with the given key=value. Nested keys use dot notation in selectors.

Annotation text is automatically fuzzy-matched against the document prose — you do not need to quote it exactly.`,
    schema: PatchJsonBlockArgs,
    handler: async (files, { path, language, operations }) => {
      const content = files.get(path)
      if (!content) return err(`${path}: No such file`)

      const block = findSingletonBlock(content, language)
      if (!block) return err(`${path}: No \`${language}\` block found`)

      const json = parseBlockJson(block)
      if (json === null) return err(`${path}: Failed to parse JSON in \`${language}\` block`)

      const { accepted, rejectedPaths } = partitionNumericIndices(operations)
      const rejectedNote = rejectedPaths.length > 0
        ? `\nRejected ${rejectedPaths.length} op(s) with numeric indices (use selectors instead): ${rejectedPaths.join(", ")}`
        : ""

      if (accepted.length === 0) {
        return err(`All operations use numeric array indices. Use selectors instead, e.g. /annotations[id=annotation_abc]${rejectedNote}`)
      }

      const selectorResult = resolveSelectors(accepted, json)
      if (!selectorResult.ok) return err(`Selector failed: ${selectorResult.error}`)

      const fuzzyOps = selectorResult.ops.map(autoFuzzyAnnotationText)
      const applied = applyJsonPatchOps(json, fuzzyOps)
      if (!applied.ok) return err(`Patch failed: ${applied.error}`)

      const diffResult = generateJsonBlockPatch(content, language, applied.result as object)
      if (!diffResult.ok) return err(`Diff generation failed: ${diffResult.error}`)

      if (!diffResult.patch) return ok(`${path}: No changes${rejectedNote}`)

      return ok(`Patched \`${language}\` block in ${path}${rejectedNote}`, [{ type: "update_file", path, diff: diffResult.patch }])
    },
  })
)
