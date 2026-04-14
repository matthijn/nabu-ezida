import { parseV4ADiff, applyHunks } from "./parse"

export type FieldDiffResult = { ok: true; content: string } | { ok: false; error: string }

export const applyFieldDiff = (value: string, diff: string): FieldDiffResult =>
  applyHunks(value, parseV4ADiff(diff))
