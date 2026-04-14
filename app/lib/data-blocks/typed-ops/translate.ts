import type { JsonPatchOp } from "~/lib/patch/structured-json/apply"
import type { TypedOpsSpec, ArrayOpSpec } from "./derive"

type TypedOp = Record<string, unknown>

const findArrayOp = (spec: TypedOpsSpec, singular: string): ArrayOpSpec | undefined =>
  spec.arrayOps.find((a) => a.singularName === singular)

const translateSet = (fields: Record<string, unknown>): JsonPatchOp[] =>
  Object.entries(fields).map(([key, value]) => ({
    op: "replace" as const,
    path: `/${key}`,
    value,
  }))

const translateAdd = (fieldName: string, item: unknown): JsonPatchOp[] => [
  { op: "add" as const, path: `/${fieldName}/-`, value: item },
]

const translateRemove = (
  fieldName: string,
  matchKey: string,
  matchValue: string
): JsonPatchOp[] => [{ op: "remove" as const, path: `/${fieldName}[${matchKey}=${matchValue}]` }]

const translateSetItem = (
  fieldName: string,
  matchKey: string,
  matchValue: string,
  fields: Record<string, unknown>
): JsonPatchOp[] =>
  Object.entries(fields).map(([key, value]) => ({
    op: "replace" as const,
    path: `/${fieldName}[${matchKey}=${matchValue}]/${key}`,
    value,
  }))

const extractSuffix = (opName: string, prefix: string): string => opName.slice(prefix.length)

export const translateOps = (ops: TypedOp[], spec: TypedOpsSpec): JsonPatchOp[] =>
  ops.flatMap((op) => translateSingleOp(op, spec))

const translateSingleOp = (op: TypedOp, spec: TypedOpsSpec): JsonPatchOp[] => {
  const opName = op.op as string

  if (opName === "set") return translateSet(op.fields as Record<string, unknown>)

  if (opName.startsWith("add_")) {
    const singular = extractSuffix(opName, "add_")
    const arrayOp = findArrayOp(spec, singular)
    if (!arrayOp) throw new Error(`unknown op: ${opName}`)
    return translateAdd(arrayOp.fieldName, op.item)
  }

  if (opName.startsWith("remove_")) {
    const singular = extractSuffix(opName, "remove_")
    const arrayOp = findArrayOp(spec, singular)
    if (!arrayOp) throw new Error(`unknown op: ${opName}`)
    const match = op.match as Record<string, string>
    return translateRemove(arrayOp.fieldName, arrayOp.matchKey, match[arrayOp.matchKey])
  }

  if (opName.startsWith("set_")) {
    const singular = extractSuffix(opName, "set_")
    const arrayOp = findArrayOp(spec, singular)
    if (!arrayOp) throw new Error(`unknown op: ${opName}`)
    const match = op.match as Record<string, string>
    return translateSetItem(
      arrayOp.fieldName,
      arrayOp.matchKey,
      match[arrayOp.matchKey],
      op.fields as Record<string, unknown>
    )
  }

  throw new Error(`unknown op: ${opName}`)
}
