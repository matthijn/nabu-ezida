import { z } from "zod"
import { tool, registerTool, ok, partial, err } from "../../executors/tool"
import type { AnyTool } from "../../executors/tool"
import type { RawFiles } from "../../types"
import type { BlockTypeConfig } from "~/lib/data-blocks/definition"
import { getFuzzyFields } from "~/lib/data-blocks/registry"
import { applyEnrichedOps } from "~/lib/patch/structured-json/pipeline"
import {
  deriveTypedOps,
  deriveOpsJsonSchema,
  type TypedOpsSpec,
} from "~/lib/data-blocks/typed-ops/derive"
import { translateOps } from "~/lib/data-blocks/typed-ops/translate"
import { applyFieldDiff } from "~/lib/patch/diff/field-diff"
import {
  resolveFile,
  resolveBlock,
  resolveBlockForDelete,
  writeBack,
  deleteBlock,
  validatePatchedDoc,
  formatJson,
} from "./shared"

interface GenerateOpts {
  guidance?: string
}

const PARALLEL_NOTE =
  "parallel: self=diff blocks yes / others=with reads yes / same block: batch into operations array"

const extractFieldNames = (schema: unknown): string[] => {
  const props = (schema as Record<string, unknown>).properties as
    | Record<string, unknown>
    | undefined
  return props ? Object.keys(props) : []
}

const buildUpdateLine = (spec: TypedOpsSpec): string | null => {
  const allFields = extractFieldNames(spec.updateFieldsSchema)
  if (allFields.length === 0) return null

  const multilineSet = new Set(spec.multilineFields)
  const scalarFields = allFields.filter((f) => !multilineSet.has(f))
  const overlapFields = allFields.filter((f) => multilineSet.has(f))

  const parts: string[] = []
  if (scalarFields.length > 0) {
    parts.push(`replace individual fields (${scalarFields.join(", ")})`)
  }
  if (overlapFields.length > 0) {
    const patchRefs = overlapFields.map((f) => `patch_${f}`).join(", ")
    const prefix = scalarFields.length > 0 ? "also accepts" : "set"
    parts.push(`${prefix} ${overlapFields.join(", ")}, but prefer ${patchRefs} for long content`)
  }

  return `- update: ${parts.join(". ")}`
}

const buildPatchDescription = (spec: TypedOpsSpec): string => {
  const blockIdNote = spec.singleton ? "" : " Requires block_id."
  const header = `Apply typed operations to a \`${spec.language}\` block.${blockIdNote}`

  const ops: string[] = []

  const updateLine = buildUpdateLine(spec)
  if (updateLine) ops.push(updateLine)

  for (const a of spec.arrayOps) {
    ops.push(`- add_${a.singularName}: append item to ${a.fieldName}`)
    ops.push(`- remove_${a.singularName}: remove from ${a.fieldName} by ${a.matchKey}`)
    ops.push(`- update_${a.singularName}: partial update in ${a.fieldName} by ${a.matchKey}`)
  }

  for (const field of spec.multilineFields) {
    ops.push(
      `- patch_${field}: V4A diff against ${field} — prefer over update for substantial content`
    )
  }

  return [header, "", "Operations:", ...ops, "", PARALLEL_NOTE].join("\n")
}

const buildDeleteDescription = (spec: TypedOpsSpec): string => {
  const blockIdNote = spec.singleton
    ? " No block_id needed (singleton)."
    : " Requires block_id to target a specific block."
  return `Delete an entire \`${spec.language}\` block from a document.${blockIdNote}\n\n${PARALLEL_NOTE}`
}

const buildLooseSchema = (spec: TypedOpsSpec) =>
  z.object({
    path: z.string().min(1),
    ...(spec.singleton ? {} : { block_id: z.string().optional() }),
    operations: z.array(z.any()).min(1),
  })

const buildDeleteLooseSchema = (spec: TypedOpsSpec) =>
  z.object({
    path: z.string().min(1),
    ...(spec.singleton ? {} : { block_id: z.string().optional() }),
  })

interface FieldDiffOp {
  field: string
  diff: string
}

const PATCH_FIELD_PREFIX = "patch_"

const isFieldDiffOp = (
  op: Record<string, unknown>,
  multilineFields: Set<string>
): op is { op: string; diff: string } =>
  typeof op.op === "string" &&
  op.op.startsWith(PATCH_FIELD_PREFIX) &&
  multilineFields.has(op.op.slice(PATCH_FIELD_PREFIX.length)) &&
  typeof op.diff === "string"

const partitionFieldDiffOps = (
  operations: Record<string, unknown>[],
  multilineFields: string[]
): { regularOps: Record<string, unknown>[]; fieldDiffOps: FieldDiffOp[] } => {
  const fieldSet = new Set(multilineFields)
  const regularOps: Record<string, unknown>[] = []
  const fieldDiffOps: FieldDiffOp[] = []

  for (const op of operations) {
    if (isFieldDiffOp(op, fieldSet)) {
      fieldDiffOps.push({
        field: (op.op as string).slice(PATCH_FIELD_PREFIX.length),
        diff: op.diff as string,
      })
    } else {
      regularOps.push(op)
    }
  }

  return { regularOps, fieldDiffOps }
}

const applyFieldDiffOps = (
  doc: Record<string, unknown>,
  ops: FieldDiffOp[]
): { ok: true; doc: Record<string, unknown> } | { ok: false; error: string } => {
  let result = { ...doc }
  for (const { field, diff } of ops) {
    const value = result[field]
    if (typeof value !== "string") {
      return {
        ok: false,
        error: `patch_${field}: field "${field}" is not a string (got ${typeof value})`,
      }
    }
    const diffResult = applyFieldDiff(value, diff)
    if (!diffResult.ok) return { ok: false, error: `patch_${field}: ${diffResult.error}` }
    result = { ...result, [field]: diffResult.content }
  }
  return { ok: true, doc: result }
}

const pathSchema = (allowedFiles?: string[]): unknown =>
  allowedFiles?.length === 1
    ? { type: "string", const: allowedFiles[0] }
    : { type: "string", minLength: 1 }

const buildPatchJsonSchema = (spec: TypedOpsSpec, opsSchema: unknown): unknown => {
  const properties: Record<string, unknown> = {
    path: pathSchema(spec.allowedFiles),
  }
  const required = ["path", "operations"]

  if (!spec.singleton) {
    properties.block_id = { type: "string" }
    required.push("block_id")
  }

  properties.operations = opsSchema

  return {
    type: "object",
    properties,
    required,
  }
}

const buildDeleteJsonSchema = (spec: TypedOpsSpec): unknown => {
  const properties: Record<string, unknown> = {
    path: pathSchema(spec.allowedFiles),
  }
  const required = ["path"]

  if (!spec.singleton) {
    properties.block_id = { type: "string" }
    required.push("block_id")
  }

  return {
    type: "object",
    properties,
    required,
  }
}

const buildGuidanceResolver =
  (guidanceKey: string): ((files: RawFiles, args: Record<string, unknown>) => string[]) =>
  () => [guidanceKey]

export const generatePatchTool = (
  language: string,
  config: BlockTypeConfig,
  opts?: GenerateOpts
): AnyTool => {
  const spec = deriveTypedOps(language, config)
  const opsJsonSchema = deriveOpsJsonSchema(spec)
  const looseSchema = buildLooseSchema(spec)
  const fullJsonSchema = buildPatchJsonSchema(spec, opsJsonSchema)
  const name = `patch_${spec.shortName}`

  return registerTool(
    tool({
      name,
      description: buildPatchDescription(spec),
      schema: looseSchema,
      jsonSchema: fullJsonSchema,
      ...(opts?.guidance ? { requiresGuidance: buildGuidanceResolver(opts.guidance) } : {}),
      handler: async (_files, args) => {
        const { path, block_id, operations } = args as {
          path: string
          block_id?: string
          operations: Record<string, unknown>[]
        }

        const file = resolveFile(path)
        if (!file) return err(`${path}: No such file`)

        const { regularOps, fieldDiffOps } = partitionFieldDiffOps(operations, spec.multilineFields)

        const rfc6902Ops = translateOps(regularOps, spec)

        const resolved = resolveBlock({
          content: file.content,
          language,
          blockId: block_id,
          operations: rfc6902Ops,
        })
        if (!resolved.ok) return err(`${file.path}: ${resolved.error}`)

        let patchedDoc: unknown = resolved.json
        let failures: string[] = []
        let applied = 0
        let rejectedPaths: string[] = []

        if (rfc6902Ops.length > 0) {
          const fuzzyFields = getFuzzyFields(language)
          const enrichedResult = applyEnrichedOps(rfc6902Ops, resolved.json, file.content, {
            fuzzyFields,
          })
          patchedDoc = enrichedResult.doc
          failures = enrichedResult.failures
          applied = enrichedResult.applied
          rejectedPaths = enrichedResult.rejectedPaths
        }

        if (fieldDiffOps.length > 0) {
          const fieldResult = applyFieldDiffOps(patchedDoc as Record<string, unknown>, fieldDiffOps)
          if (!fieldResult.ok) return err(`${file.path}: ${fieldResult.error}`)
          patchedDoc = fieldResult.doc
          applied += fieldDiffOps.length
        }

        const rejectedMessage =
          rejectedPaths.length > 0
            ? `Rejected ${rejectedPaths.length} op(s) with numeric indices (use selectors instead): ${rejectedPaths.join(", ")}`
            : ""

        if (applied === 0) {
          return err(
            rejectedPaths.length > 0 && failures.length === 0
              ? "All operations use numeric array indices. Use selectors instead."
              : [rejectedMessage, ...failures].filter(Boolean).join("\n")
          )
        }

        const schemaError = validatePatchedDoc(language, patchedDoc)
        if (schemaError) return err(`Patch produces invalid \`${language}\` block: ${schemaError}`)

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
}

export const generateDeleteTool = (language: string, config: BlockTypeConfig): AnyTool => {
  const spec = deriveTypedOps(language, config)
  const looseSchema = buildDeleteLooseSchema(spec)
  const fullJsonSchema = buildDeleteJsonSchema(spec)
  const name = `delete_${spec.shortName}`

  return registerTool(
    tool({
      name,
      description: buildDeleteDescription(spec),
      schema: looseSchema,
      jsonSchema: fullJsonSchema,
      handler: async (_files, args) => {
        const { path, block_id } = args as { path: string; block_id?: string }

        const file = resolveFile(path)
        if (!file) return err(`${path}: No such file`)

        const resolved = resolveBlockForDelete(file.content, language, block_id)
        if (!resolved.ok) return err(`${file.path}: ${resolved.error}`)

        const newContent = deleteBlock(file.content, resolved.block)
        return ok(`Deleted \`${language}\` block from ${file.path}`, [
          { type: "write_file", path: file.path, content: newContent },
        ])
      },
    })
  )
}
