import { produce } from "immer"
import { applyPatch, getValueByPointer, type Operation } from "fast-json-patch"

export type { Operation }

export type PatchableMessage<T> =
  | { type: "snapshot"; data: T }
  | { type: "patch"; data: Operation[] }

const isRemoveForMissingPath = (op: Operation, doc: unknown): boolean =>
  op.op === "remove" && getValueByPointer(doc, op.path) === undefined

const filterIdempotentRemoves = (ops: Operation[], doc: unknown): Operation[] =>
  ops.filter(op => !isRemoveForMissingPath(op, doc))

export const applyPatchableMessage = <T>(
  current: T | null,
  message: PatchableMessage<T>
): T | null => {
  if (message.type === "snapshot") {
    return message.data
  }

  if (current === null) {
    return null
  }

  return produce(current, draft => {
    const ops = filterIdempotentRemoves(message.data, draft)
    applyPatch(draft, ops, true, true)
  })
}

export type DocumentChange = {
  id: string
  path: string
}

const isDocumentPath = (path: string): boolean =>
  path.startsWith("/documents/")

const getDocumentIdFromPath = (path: string): string | null => {
  const parts = path.split("/")
  return parts.length >= 3 ? parts[2] : null
}

export const getDocumentChanges = (operations: Operation[]): DocumentChange[] =>
  operations
    .filter(op => isDocumentPath(op.path))
    .map(op => ({ id: getDocumentIdFromPath(op.path)!, path: op.path }))
    .filter(change => change.id !== null)

export const getDocumentIdsFromOperations = (operations: Operation[]): string[] =>
  [...new Set(getDocumentChanges(operations).map(c => c.id))]
