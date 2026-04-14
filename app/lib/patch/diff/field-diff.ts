import { parseV4ADiff, applyHunks } from "./parse"

export type FieldDiffResult = { ok: true; content: string } | { ok: false; error: string }

const unescapeJsonEscapes = (s: string): string => s.replaceAll("\\n", "\n").replaceAll("\\t", "\t")

export const applyFieldDiff = (value: string, diff: string): FieldDiffResult =>
  applyHunks(value, parseV4ADiff(unescapeJsonEscapes(diff)))
