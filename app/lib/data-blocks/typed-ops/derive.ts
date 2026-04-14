import { toBlockSchema } from "../json-schema"
import type { BlockTypeConfig } from "../definition"

type JsonSchema = Record<string, unknown>
type Properties = Record<string, JsonSchema>

export interface ArrayOpSpec {
  fieldName: string
  singularName: string
  itemSchema: unknown
  matchKey: string
  partialItemSchema: unknown
}

export interface TypedOpsSpec {
  language: string
  shortName: string
  singleton: boolean
  allowedFiles?: string[]
  updateFieldsSchema: unknown
  arrayOps: ArrayOpSpec[]
  multilineFields: string[]
  immutableFields: string[]
  fuzzyFields: string[]
}

const stripJsonPrefix = (language: string): string =>
  language.startsWith("json-") ? language.slice(5) : language

const toSingular = (name: string): string =>
  name.endsWith("ies")
    ? name.slice(0, -3) + "y"
    : name.endsWith("es")
      ? name.slice(0, -2)
      : name.endsWith("s")
        ? name.slice(0, -1)
        : name

const isObjectArray = (prop: JsonSchema): boolean =>
  prop.type === "array" &&
  typeof prop.items === "object" &&
  prop.items !== null &&
  (prop.items as JsonSchema).type === "object"

const hasIdProperty = (itemSchema: JsonSchema): boolean => {
  const props = itemSchema.properties as Properties | undefined
  return props !== undefined && "id" in props
}

const toPartialItemSchema = (itemSchema: JsonSchema): JsonSchema => {
  const { required: _, ...rest } = itemSchema
  return rest
}

const removeImmutable = (properties: Properties, immutable: string[]): Properties => {
  const skip = new Set(immutable)
  return Object.fromEntries(Object.entries(properties).filter(([k]) => !skip.has(k)))
}

const classifyProperty = (
  fieldName: string,
  prop: JsonSchema,
  arrayOps: ArrayOpSpec[],
  updateProps: Properties
): void => {
  if (isObjectArray(prop) && hasIdProperty(prop.items as JsonSchema)) {
    const itemSchema = prop.items as JsonSchema
    arrayOps.push({
      fieldName,
      singularName: toSingular(fieldName),
      itemSchema,
      matchKey: "id",
      partialItemSchema: toPartialItemSchema(itemSchema),
    })
  } else {
    updateProps[fieldName] = prop
  }
}

const buildUpdateFieldsSchema = (properties: Properties): JsonSchema => ({
  type: "object",
  properties,
  additionalProperties: false,
})

const buildUpdateOpSchema = (fieldsSchema: JsonSchema): JsonSchema => ({
  type: "object",
  properties: {
    op: { type: "string", enum: ["update"] },
    fields: fieldsSchema,
  },
  required: ["op", "fields"],
  additionalProperties: false,
})

const buildAddOpSchema = (singular: string, itemSchema: unknown): JsonSchema => ({
  type: "object",
  properties: {
    op: { type: "string", enum: [`add_${singular}`] },
    item: itemSchema as JsonSchema,
  },
  required: ["op", "item"],
  additionalProperties: false,
})

const buildRemoveOpSchema = (singular: string, matchKey: string): JsonSchema => ({
  type: "object",
  properties: {
    op: { type: "string", enum: [`remove_${singular}`] },
    match: {
      type: "object",
      properties: { [matchKey]: { type: "string" } },
      required: [matchKey],
      additionalProperties: false,
    },
  },
  required: ["op", "match"],
  additionalProperties: false,
})

const buildUpdateItemOpSchema = (
  singular: string,
  matchKey: string,
  partialItemSchema: unknown
): JsonSchema => ({
  type: "object",
  properties: {
    op: { type: "string", enum: [`update_${singular}`] },
    match: {
      type: "object",
      properties: { [matchKey]: { type: "string" } },
      required: [matchKey],
      additionalProperties: false,
    },
    fields: partialItemSchema as JsonSchema,
  },
  required: ["op", "match", "fields"],
  additionalProperties: false,
})

const buildArrayOpSchemas = (spec: ArrayOpSpec): JsonSchema[] => [
  buildAddOpSchema(spec.singularName, spec.itemSchema),
  buildRemoveOpSchema(spec.singularName, spec.matchKey),
  buildUpdateItemOpSchema(spec.singularName, spec.matchKey, spec.partialItemSchema),
]

const buildPatchFieldOpSchema = (fieldName: string): JsonSchema => ({
  type: "object",
  properties: {
    op: { type: "string", enum: [`patch_${fieldName}`] },
    diff: { type: "string", minLength: 1 },
  },
  required: ["op", "diff"],
  additionalProperties: false,
})

export const deriveOpsJsonSchema = (spec: TypedOpsSpec): unknown => {
  const variants: JsonSchema[] = [buildUpdateOpSchema(spec.updateFieldsSchema as JsonSchema)]
  for (const arrayOp of spec.arrayOps) {
    variants.push(...buildArrayOpSchemas(arrayOp))
  }
  for (const field of spec.multilineFields) {
    variants.push(buildPatchFieldOpSchema(field))
  }
  return {
    type: "array",
    items: variants.length === 1 ? variants[0] : { oneOf: variants },
    minItems: 1,
  }
}

export const deriveTypedOps = (language: string, config: BlockTypeConfig): TypedOpsSpec => {
  const blockSchema = toBlockSchema(config) as JsonSchema
  const allProperties = (blockSchema.properties ?? {}) as Properties
  const immutableFields = Object.keys(config.immutable)
  const editable = removeImmutable(allProperties, immutableFields)

  const arrayOps: ArrayOpSpec[] = []
  const updateProps: Properties = {}

  for (const [fieldName, prop] of Object.entries(editable)) {
    classifyProperty(fieldName, prop, arrayOps, updateProps)
  }

  return {
    language,
    shortName: stripJsonPrefix(language),
    singleton: config.singleton,
    allowedFiles: config.allowedFiles,
    updateFieldsSchema: buildUpdateFieldsSchema(updateProps),
    arrayOps,
    multilineFields: config.multilineFields ?? [],
    immutableFields,
    fuzzyFields: config.fuzzyFields ?? [],
  }
}
