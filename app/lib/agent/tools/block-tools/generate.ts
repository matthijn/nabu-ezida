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

const buildPatchDescription = (spec: TypedOpsSpec): string => {
  const opNames = ["update"]
  for (const arrayOp of spec.arrayOps) {
    opNames.push(
      `add_${arrayOp.singularName}`,
      `remove_${arrayOp.singularName}`,
      `update_${arrayOp.singularName}`
    )
  }
  const blockIdNote = spec.singleton ? "" : " Requires block_id to target a specific block."
  return `Apply typed operations to a \`${spec.language}\` block. Operations: ${opNames.join(", ")}.${blockIdNote}\n\n${PARALLEL_NOTE}`
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

        const rfc6902Ops = translateOps(operations, spec)

        const resolved = resolveBlock({
          content: file.content,
          language,
          blockId: block_id,
          operations: rfc6902Ops,
        })
        if (!resolved.ok) return err(`${file.path}: ${resolved.error}`)

        const fuzzyFields = getFuzzyFields(language)
        const {
          doc: patchedDoc,
          failures,
          applied,
          rejectedPaths,
        } = applyEnrichedOps(rfc6902Ops, resolved.json, file.content, { fuzzyFields })

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
