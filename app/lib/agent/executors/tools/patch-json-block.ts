import { z } from "zod"
import { tool, registerTool, ok, partial, err } from "../tool"
import { patchJsonBlock as def } from "./patch-json-block.def"
import { findSingletonBlock, parseBlockJson, replaceSingletonBlock } from "~/domain/blocks/parse"
import type { JsonPatchOp } from "~/lib/diff/json-block/apply"
import { applyJsonPatchOps } from "~/lib/diff/json-block/apply"
import { generateBlockContentDiff, formatJson } from "~/lib/diff/json-block/patch"
import { hasFuzzyPatterns } from "~/lib/diff/fuzzy-inline"
import { dedupArraysIn } from "~/lib/diff/json-block/dedup"
import { getBlockConfig } from "~/domain/blocks/registry"
import { getFile } from "~/lib/files"
import { toExtraPretty } from "~/lib/json"

type SelectorOp = "eq" | "neq" | "exists" | "not_exists"
type Selector = { arrayPath: string; key: string; op: SelectorOp; value: string; rest: string }

const SELECTOR_REGEX = /^(\/[^[]+)\[(!?)([^\]!=]+)(?:(!=|=)([^\]]+))?\](\/.*)?$/

const parseSelector = (path: string): Selector | null => {
  const match = path.match(SELECTOR_REGEX)
  if (!match) return null
  const [, arrayPath, negation, key, operator, value, rest] = match
  const op: SelectorOp = operator === "!=" ? "neq"
    : operator === "=" ? "eq"
    : negation === "!" ? "not_exists"
    : "exists"
  return { arrayPath, key, op, value: value ?? "", rest: rest ?? "" }
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

const isTruthy = (v: unknown): boolean =>
  v !== undefined && v !== null && v !== "" && v !== false

const matchesSelectorOp = (resolved: unknown, op: SelectorOp, value: string): boolean => {
  switch (op) {
    case "eq": return String(resolved) === value
    case "neq": return String(resolved) !== value
    case "exists": return isTruthy(resolved)
    case "not_exists": return !isTruthy(resolved)
    default: throw new Error(`unknown selector op: ${op}`)
  }
}

const resolveArray = (doc: unknown, arrayPath: string): unknown[] | null => {
  const segments = arrayPath.split("/").filter(Boolean)
  let current: unknown = doc
  for (const seg of segments) {
    if (current === null || typeof current !== "object") return null
    current = (current as Record<string, unknown>)[seg]
  }
  return Array.isArray(current) ? current : null
}

const findMatchingIndices = (doc: unknown, selector: Selector): number[] => {
  const arr = resolveArray(doc, selector.arrayPath)
  if (!arr) return []
  const indices: number[] = []
  for (let i = 0; i < arr.length; i++) {
    if (matchesSelectorOp(getNestedValue(arr[i], selector.key), selector.op, selector.value)) {
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

const resolveSelectorOp = (op: JsonPatchOp, doc: unknown): ResolveResult => {
  const selector = parseSelector(op.path)
  if (!selector) return { ok: true, ops: [op] }
  const indices = findMatchingIndices(doc, selector)
  if (indices.length === 0) return { ok: false, error: `No items match ${op.path}` }
  return { ok: true, ops: expandOpWithSelector(op, indices, selector) }
}

export const resolveSelectors = (ops: JsonPatchOp[], doc: unknown): ResolveResult => {
  const resolved: JsonPatchOp[] = []
  for (const op of ops) {
    const result = resolveSelectorOp(op, doc)
    if (!result.ok) return result
    resolved.push(...result.ops)
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

const normalizeDoubleExt = (path: string): string =>
  path.replace(/(\.\w+)\1+$/, "$1")

type ResolvedFile = { content: string; path: string }

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
  const schema = z.toJSONSchema(config.schema, { io: "input" }) as JsonSchemaObj
  if (!schema.properties) return new Set()
  return new Set(
    Object.entries(schema.properties)
      .filter(([, prop]) => prop.type === "array")
      .map(([key]) => key)
  )
}

const appendTargets = (ops: JsonPatchOp[]): string[] => [
  ...new Set(ops.filter((op) => op.path.endsWith("/-")).map((op) => op.path.split("/").filter(Boolean)[0]))
]

const seedAppendArrays = (ops: JsonPatchOp[], validFields: Set<string>): Record<string, unknown> => {
  const doc: Record<string, unknown> = {}
  for (const field of appendTargets(ops)) {
    if (validFields.has(field)) doc[field] = []
  }
  return doc
}

type ApplyResult = { doc: unknown; failures: string[]; applied: number }

const applyOpsIndividually = (ops: JsonPatchOp[], doc: unknown): ApplyResult => {
  let currentDoc = doc
  const failures: string[] = []
  let applied = 0

  for (const op of ops) {
    const resolved = resolveSelectorOp(op, currentDoc)
    if (!resolved.ok) {
      failures.push(resolved.error)
      continue
    }

    const fuzzyOps = resolved.ops.map(autoFuzzyAnnotationText)
    const result = applyJsonPatchOps(currentDoc, fuzzyOps)
    if (!result.ok) {
      failures.push(`${op.path}: ${result.error}`)
      continue
    }

    currentDoc = result.result
    applied++
  }

  return { doc: currentDoc, failures, applied }
}

export const patchJsonBlock = registerTool(
  tool({
    ...def,
    handler: async (_files, { path, language, operations }) => {
      const file = resolveFile(path)
      if (!file) return err(`${path}: No such file`)

      const block = findSingletonBlock(file.content, language)
      let json: unknown

      if (block) {
        const parsed = parseBlockJson(block)
        if (!parsed.ok) return err(`${file.path}: Failed to parse JSON in \`${language}\` block: ${parsed.error}\n---\n${parsed.raw}`)
        json = parsed.data
      } else {
        const validFields = schemaArrayFields(language)
        if (!validFields) return err(`${file.path}: No \`${language}\` block found`)
        json = seedAppendArrays(operations, validFields)
      }

      const { accepted, rejectedPaths } = partitionNumericIndices(operations)
      const rejectedMessage = rejectedPaths.length > 0
        ? `Rejected ${rejectedPaths.length} op(s) with numeric indices (use selectors instead): ${rejectedPaths.join(", ")}`
        : ""

      if (accepted.length === 0) {
        return err(`All operations use numeric array indices. Use selectors instead, e.g. /annotations[id=annotation_abc]`)
      }

      const { doc: patchedDoc, failures, applied } = applyOpsIndividually(accepted, json)

      if (applied === 0) {
        return err([rejectedMessage, ...failures].filter(Boolean).join("\n"))
      }

      const deduped = dedupArraysIn(patchedDoc) as object
      const newRaw = replaceSingletonBlock(file.content, language, formatJson(deduped))
      const prettyOld = toExtraPretty(file.content)
      const prettyNew = toExtraPretty(newRaw)
      const diffResult = generateBlockContentDiff(prettyOld, prettyNew, language)
      if (!diffResult.ok) return err(`Diff generation failed: ${diffResult.error}`)

      const successOutput = diffResult.patch
        ? `Patched \`${language}\` block in ${file.path}`
        : `${file.path}: No changes`

      const mutations = diffResult.patch
        ? [{ type: "update_file" as const, path: file.path, diff: diffResult.patch }]
        : []

      const allFailures = [rejectedMessage, ...failures].filter(Boolean)

      return allFailures.length > 0
        ? partial(successOutput, allFailures.join("\n"), mutations)
        : ok(successOutput, mutations)
    },
  })
)
