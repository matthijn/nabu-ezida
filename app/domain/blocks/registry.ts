import { z } from "zod"
import { DocumentMeta, type StoredAnnotation } from "~/domain/attributes/schema"
import { CalloutSchema, type CalloutBlock } from "./callout"
import type { ValidationError } from "./validate"

export type ValidationContext = {
  documentProse: string
  availableCodes: { id: string; name: string }[]
}

type IdPathConfig = {
  path: string  // "id" for root, "annotations.*.id" for nested array items
  prefix: string
}

type BlockTypeConfig<T> = {
  schema: z.ZodType<T>
  readonly: string[]
  immutable: Record<string, string>
  renderer: "hidden" | "callout"
  singleton: boolean
  labelKey?: string
  idPaths?: IdPathConfig[]
  validate?: (parsed: T, context: ValidationContext) => ValidationError[]
}

const defineBlock = <T>(config: BlockTypeConfig<T>): BlockTypeConfig<T> => config

const textExistsInProse = (text: string, prose: string): boolean =>
  prose.toLowerCase().includes(text.toLowerCase())

const codeExists = (codeId: string, codes: { id: string }[]): boolean =>
  codes.some((c) => c.id === codeId)

const formatAvailableCodes = (codes: { id: string; name: string }[]): Record<string, string> =>
  Object.fromEntries(codes.map((c) => [c.name, c.id]))

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
        message: `Text "${annotation.text}" not found in document. Use exact text from the document. If unsure, use FUZZY[approximate text] for fuzzy matching (e.g. "text": "FUZZY[somthing like this]").`,
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

const jsonAttributes = defineBlock({
  schema: DocumentMeta,
  readonly: [],
  immutable: {},
  renderer: "hidden",
  singleton: true,
  idPaths: [{ path: "annotations.*.id", prefix: "annotation" }],
  validate: (parsed, context) => validateAnnotations(parsed.annotations, context),
})

const jsonCallout = defineBlock({
  schema: CalloutSchema,
  readonly: [],
  immutable: {
    id: "Field \"id\" is immutable and cannot be changed",
  },
  renderer: "callout",
  singleton: false,
  labelKey: "title",
  idPaths: [{ path: "id", prefix: "callout" }],
})

type AnyBlockConfig = BlockTypeConfig<unknown>

export const blockTypes: Record<string, AnyBlockConfig> = {
  "json-attributes": jsonAttributes as AnyBlockConfig,
  "json-callout": jsonCallout as AnyBlockConfig,
}

export const getBlockConfig = (language: string): AnyBlockConfig | undefined =>
  blockTypes[language]

export const isKnownBlockType = (language: string): boolean =>
  language in blockTypes

export const isSingleton = (language: string): boolean =>
  blockTypes[language]?.singleton ?? false

export const getLabelKey = (language: string): string | undefined =>
  blockTypes[language]?.labelKey

export const getImmutableFields = (language: string): Record<string, string> =>
  blockTypes[language]?.immutable ?? {}

export const getIdPaths = (language: string): IdPathConfig[] =>
  blockTypes[language]?.idPaths ?? []

export type { IdPathConfig }
