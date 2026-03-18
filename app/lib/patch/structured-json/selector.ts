import type { JsonPatchOp } from "./apply"

export type SelectorOp = "eq" | "neq" | "exists" | "not_exists"

export interface Selector {
  arrayPath: string
  key: string
  op: SelectorOp
  value: string
  rest: string
}

export type ResolveResult = { ok: true; ops: JsonPatchOp[] } | { ok: false; error: string }

export interface OpPartition {
  accepted: JsonPatchOp[]
  rejectedPaths: string[]
}

export const parseSelector = (path: string): Selector | null => {
  const match = path.match(SELECTOR_REGEX)
  if (!match) return null
  const [, arrayPath, negation, key, operator, value, rest] = match
  const op: SelectorOp =
    operator === "!=" ? "neq" : operator === "=" ? "eq" : negation === "!" ? "not_exists" : "exists"
  return { arrayPath, key, op, value: value ?? "", rest: rest ?? "" }
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

export const resolveSelectorOp = (op: JsonPatchOp, doc: unknown): ResolveResult => {
  const selector = parseSelector(op.path)
  if (!selector) return { ok: true, ops: [op] }
  const indices = findMatchingIndices(doc, selector)
  if (indices.length === 0) return { ok: false, error: `No items match ${op.path}` }
  return { ok: true, ops: expandOpWithSelector(op, indices, selector) }
}

const SELECTOR_REGEX = /^(\/[^[]+)\[(!?)([^\]!=]+)(?:(!=|=)([^\]]+))?\](\/.*)?$/
const NUMERIC_INDEX_REGEX = /\/\d+(\/|$)/

const hasNumericIndex = (path: string): boolean => NUMERIC_INDEX_REGEX.test(path)

const collectOpPaths = (op: JsonPatchOp): string[] =>
  "from" in op && op.from ? [op.path, op.from] : [op.path]

const isNumericIndexOp = (op: JsonPatchOp): boolean =>
  collectOpPaths(op).some((p) => !parseSelector(p) && hasNumericIndex(p))

const getNestedValue = (obj: unknown, path: string): unknown => {
  const segments = path.split(".")
  let current: unknown = obj
  for (const seg of segments) {
    if (current === null || typeof current !== "object") return undefined
    current = (current as Record<string, unknown>)[seg]
  }
  return current
}

const isTruthy = (v: unknown): boolean => v !== undefined && v !== null && v !== "" && v !== false

const matchesSelectorOp = (resolved: unknown, op: SelectorOp, value: string): boolean => {
  switch (op) {
    case "eq":
      return String(resolved) === value
    case "neq":
      return String(resolved) !== value
    case "exists":
      return isTruthy(resolved)
    case "not_exists":
      return !isTruthy(resolved)
    default:
      throw new Error(`unknown selector op: ${op}`)
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

const expandOpWithSelector = (
  op: JsonPatchOp,
  indices: number[],
  selector: Selector
): JsonPatchOp[] => {
  const sorted = op.op === "remove" ? [...indices].sort((a, b) => b - a) : indices
  return sorted.map((i) => ({
    ...op,
    path: `${selector.arrayPath}/${i}${selector.rest}`,
  }))
}
