import type { JsonPatchOp } from "./apply"
import { applyJsonPatchOps } from "./apply"
import { partitionNumericIndices, resolveSelectorOp } from "./selector"
import {
  resolveFuzzyFieldValues,
  parseFuzzyFieldPatterns,
  type FuzzyFieldPattern,
} from "./fuzzy-fields"
import { dedupArraysIn } from "./dedup"

export interface EnrichedPatchConfig {
  fuzzyFields: string[]
}

export interface EnrichedPatchResult {
  doc: unknown
  failures: string[]
  applied: number
  rejectedPaths: string[]
}

export const applyEnrichedOps = (
  ops: JsonPatchOp[],
  doc: unknown,
  content: string,
  config: EnrichedPatchConfig
): EnrichedPatchResult => {
  const { accepted, rejectedPaths } = partitionNumericIndices(ops)
  const patterns = parseFuzzyFieldPatterns(config.fuzzyFields)
  const {
    doc: patchedDoc,
    failures,
    applied,
  } = applyOpsIndividually(accepted, doc, content, patterns)
  return {
    doc: applied > 0 ? dedupArraysIn(patchedDoc) : patchedDoc,
    failures,
    applied,
    rejectedPaths,
  }
}

const isIdempotentRemove = (op: JsonPatchOp): boolean => op.op === "remove"

const applyOpsIndividually = (
  ops: JsonPatchOp[],
  doc: unknown,
  content: string,
  patterns: FuzzyFieldPattern[]
): { doc: unknown; failures: string[]; applied: number } => {
  let currentDoc = doc
  const failures: string[] = []
  let applied = 0

  for (const op of ops) {
    const resolved = resolveSelectorOp(op, currentDoc)
    if (!resolved.ok) {
      failures.push(resolved.error)
      continue
    }

    const fuzzyResult = resolveFuzzyFieldValues(resolved.ops, content, patterns)
    if (!fuzzyResult.ok) {
      failures.push(fuzzyResult.error)
      continue
    }

    const result = applyJsonPatchOps(currentDoc, fuzzyResult.ops)
    if (!result.ok) {
      if (isIdempotentRemove(op)) continue
      failures.push(`${op.path}: ${result.error}`)
      continue
    }

    currentDoc = result.result
    applied++
  }

  return { doc: currentDoc, failures, applied }
}
