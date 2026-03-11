import { z } from "zod"
import { DocumentMeta, type StoredAnnotation } from "~/domain/attributes/schema"
import { Settings, type TagDefinition } from "~/domain/settings/schema"
import { SETTINGS_FILE } from "~/lib/files/filename"
import { CalloutSchema, type CalloutBlock } from "./callout"
import type { ValidationError } from "./validate"
import { parsePath, type ParsedPath } from "./json"

export type ValidationContext = {
  documentProse: string
  availableCodes: { id: string; name: string }[]
  availableTags: { id: string; label: string }[]
}

type IdPathConfig = {
  path: string  // "id" for root, "annotations.*.id" for nested array items
  prefix: string
}

type ActorPathConfig = {
  path: string  // "actor" for root, "annotations.*.actor" for nested array items
}

type JsonSchema = Record<string, unknown>

type BlockTypeConfig<T> = {
  schema: z.ZodType<T>
  readonly: string[]
  immutable: Record<string, string>
  constraints: string[]
  renderer: "hidden" | "callout"
  singleton: boolean
  allowedFiles?: string[]
  labelKey?: string
  idPaths?: IdPathConfig[]
  actorPaths?: ActorPathConfig[]
  patchSchema?: (schema: JsonSchema) => JsonSchema
  validate?: (parsed: T, context: ValidationContext) => ValidationError[]
}

const defineBlock = <T>(config: BlockTypeConfig<T>): BlockTypeConfig<T> => config

const textExistsInProse = (text: string, prose: string): boolean =>
  prose.toLowerCase().includes(text.toLowerCase())

const codeExists = (codeId: string, codes: { id: string }[]): boolean =>
  codes.some((c) => c.id === codeId)

const formatAvailableCodes = (codes: { id: string; name: string }[]): Record<string, string> =>
  Object.fromEntries(codes.map((c) => [c.name, c.id]))

const tagIdExists = (id: string, available: { id: string; label: string }[]): boolean =>
  available.some((t) => t.id === id)

const formatAvailableTags = (tags: { id: string; label: string }[]): Record<string, string> =>
  Object.fromEntries(tags.map((t) => [t.label, t.id]))

const validateTags = (
  tags: string[] | undefined,
  context: ValidationContext
): ValidationError[] => {
  if (!tags || context.availableTags.length === 0) return []

  return tags
    .filter((tag) => !tagIdExists(tag, context.availableTags))
    .map((tag) => ({
      block: "json-attributes",
      field: "tags",
      message: `Tag "${tag}" is not defined in settings`,
      hint: formatAvailableTags(context.availableTags),
    }))
}

const validateAnnotations = (
  annotations: StoredAnnotation[] | undefined,
  context: ValidationContext
): ValidationError[] => {
  if (!annotations) return []

  const errors: ValidationError[] = []

  for (const annotation of annotations) {
    if (!textExistsInProse(annotation.text, context.documentProse)) {
      errors.push({
        block: "json-attributes",
        field: "annotations",
        message: `Text "${annotation.text}" not found in document. Use exact text from the document. If unsure, use FUZZY[[approximate text]] for fuzzy matching (e.g. "text": "FUZZY[[somthing like this]]").`,
      })
    }

    if (annotation.code && !codeExists(annotation.code, context.availableCodes)) {
      errors.push({
        block: "json-attributes",
        field: "annotations",
        message: `Code "${annotation.code}" not found`,
        hint: formatAvailableCodes(context.availableCodes),
      })
    }
  }

  return errors
}

const modifySchemaAtPath = (
  schema: JsonSchema,
  path: string[],
  modify: (target: JsonSchema) => JsonSchema
): JsonSchema => {
  if (path.length === 0) return modify(schema)

  const [head, ...rest] = path
  const child = schema[head]
  if (typeof child !== "object" || child === null) return schema
  return { ...schema, [head]: modifySchemaAtPath(child as JsonSchema, rest, modify) }
}

const removeFromRequired = (schema: JsonSchema, path: string[], fields: string[]): JsonSchema =>
  modifySchemaAtPath(schema, path, (target) => {
    const required = target.required as string[] | undefined
    if (!required) return target
    const filtered = required.filter((f) => !fields.includes(f))
    return { ...target, required: filtered }
  })

const removeFromProperties = (schema: JsonSchema, path: string[], field: string): JsonSchema =>
  modifySchemaAtPath(schema, path, (target) => {
    const props = target.properties as Record<string, unknown> | undefined
    if (!props || !(field in props)) return target
    const { [field]: _, ...rest } = props
    return { ...target, properties: rest }
  })

const actorSchemaPath = (parsed: ParsedPath): string[] =>
  parsed.type === "root"
    ? []
    : ["properties", parsed.arrayField, "items"]

const stripActorFields = (schema: JsonSchema, actorPaths: ActorPathConfig[]): JsonSchema =>
  actorPaths.reduce((s, { path }) => {
    const parsed = parsePath(path)
    if (!parsed) return s
    const field = parsed.type === "root" ? parsed.field : parsed.itemField
    return removeFromProperties(s, actorSchemaPath(parsed), field)
  }, schema)

const patchAnnotationRequired = (schema: JsonSchema): JsonSchema =>
  removeFromRequired(schema, ["properties", "annotations", "items"], ["color", "code"])

const jsonAttributes = defineBlock({
  schema: DocumentMeta,
  readonly: [],
  immutable: {},
  constraints: [
    "tags: must be tag IDs defined in settings",
    "annotations: each entry requires either 'color' or 'code', not both",
    "annotations.text: must be text from the document prose (fuzzy-matched automatically)",
  ],
  renderer: "hidden",
  singleton: true,
  idPaths: [{ path: "annotations.*.id", prefix: "annotation" }],
  actorPaths: [{ path: "annotations.*.actor" }],
  patchSchema: patchAnnotationRequired,
  validate: (parsed, context) => [
    ...validateTags(parsed.tags, context),
    ...validateAnnotations(parsed.annotations, context),
  ],
})

const findDuplicateLabels = (tags: TagDefinition[]): string[] => {
  const seen = new Set<string>()
  return tags.filter((t) =>
    !seen.has(t.label) ? (seen.add(t.label), false) : true
  ).map((t) => t.label)
}

const formatAllTags = (tags: TagDefinition[]): Record<string, string> =>
  Object.fromEntries(tags.map((t) => [t.label, t.id]))

const validateTagLabels = (parsed: Settings): ValidationError[] => {
  if (!parsed.tags) return []
  const dupes = findDuplicateLabels(parsed.tags)
  if (dupes.length === 0) return []
  return dupes.map((label) => ({
    block: "json-settings",
    field: "tags",
    message: `Duplicate tag label "${label}". Existing tags:`,
    hint: formatAllTags(parsed.tags!),
  }))
}

const jsonSettings = defineBlock({
  schema: Settings,
  readonly: [],
  immutable: {},
  constraints: ["tags: each tag label must be unique"],
  renderer: "hidden",
  singleton: true,
  allowedFiles: [SETTINGS_FILE],
  idPaths: [{ path: "tags.*.id", prefix: "tag" }],
  validate: validateTagLabels,
})

const jsonCallout = defineBlock({
  schema: CalloutSchema,
  readonly: [],
  immutable: {
    id: "Field \"id\" is immutable and cannot be changed",
  },
  constraints: [],
  renderer: "callout",
  singleton: false,
  labelKey: "title",
  idPaths: [{ path: "id", prefix: "callout" }],
  actorPaths: [{ path: "actor" }],
})

type AnyBlockConfig = BlockTypeConfig<unknown>

export const blockTypes: Record<string, AnyBlockConfig> = {
  "json-attributes": jsonAttributes as AnyBlockConfig,
  "json-settings": jsonSettings as AnyBlockConfig,
  "json-callout": jsonCallout as AnyBlockConfig,
}

export const getBlockConfig = (language: string): AnyBlockConfig | undefined =>
  blockTypes[language]

export const isKnownBlockType = (language: string): boolean =>
  language in blockTypes

export const isHiddenRenderer = (language: string): boolean =>
  blockTypes[language]?.renderer === "hidden"

export const isSingleton = (language: string): boolean =>
  blockTypes[language]?.singleton ?? false

export const getLabelKey = (language: string): string | undefined =>
  blockTypes[language]?.labelKey

export const getImmutableFields = (language: string): Record<string, string> =>
  blockTypes[language]?.immutable ?? {}

export const getIdPaths = (language: string): IdPathConfig[] =>
  blockTypes[language]?.idPaths ?? []

export const getActorPaths = (language: string): ActorPathConfig[] =>
  blockTypes[language]?.actorPaths ?? []

export const getAllowedFiles = (language: string): string[] | undefined =>
  blockTypes[language]?.allowedFiles

export type BlockSchemaDefinition = {
  language: string
  jsonSchema: unknown
  singleton: boolean
  immutable: string[]
  constraints: string[]
}

const toBlockSchema = (config: AnyBlockConfig): unknown => {
  let schema = z.toJSONSchema(config.schema, { io: "input" }) as JsonSchema
  if (config.patchSchema) schema = config.patchSchema(schema)
  if (config.actorPaths?.length) schema = stripActorFields(schema, config.actorPaths)
  return schema
}

export const getBlockSchemaDefinitions = (): BlockSchemaDefinition[] =>
  Object.entries(blockTypes).map(([language, config]) => ({
    language,
    jsonSchema: toBlockSchema(config),
    singleton: config.singleton,
    immutable: Object.keys(config.immutable),
    constraints: config.constraints,
  }))

export type { IdPathConfig, ActorPathConfig }
