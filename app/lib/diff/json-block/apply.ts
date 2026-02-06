import { applyPatch, deepClone, type Operation } from "fast-json-patch"

export type JsonPatchOp = Operation

export type ApplyResult =
  | { ok: true; result: unknown }
  | { ok: false; error: string }

export const applyJsonPatchOps = (doc: unknown, ops: JsonPatchOp[]): ApplyResult => {
  try {
    const cloned = deepClone(doc)
    applyPatch(cloned, ops, true, true)
    return { ok: true, result: cloned }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}
