import type { ComponentType } from "react"
import { z } from "zod"
import { FeatherHighlighter } from "@subframe/core"
import { BLOCK_COLORS } from "~/domain/colors"
import { emptyToUndefined } from "~/lib/blocks/field-validate"

export const annotationIcon: ComponentType<{ className?: string }> = FeatherHighlighter

export const slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)
export const radixColor = z.enum(BLOCK_COLORS as [string, ...string[]])

const hasColorOrCode = (a: { color?: unknown; code?: unknown }) =>
  (a.color !== undefined) !== (a.code !== undefined)

const AnnotationBase = z.object({
  text: z.string().describe("Exact text from the document"),
  reason: z.string().describe("Why this text was annotated"),
  color: emptyToUndefined(radixColor).describe("Color for the annotation (if no code)"),
  code: emptyToUndefined(z.string()).describe("Code ID from codebook (if no color)"),
  review: z.string().optional().describe("Flags the annotation for human review — explain what needs attention"),
})

export const AnnotationSchema = AnnotationBase
  .extend({
    id: z.string().optional(),
    actor: z.enum(["ai", "user"]).optional(),
  })
  .refine(hasColorOrCode, "Either color or code must be set, not both")

export const AnnotationSuggestionSchema = AnnotationBase
  .extend({ deleteSuggested: z.boolean().describe("Whether this annotation should be removed") })
  .refine(hasColorOrCode, "Either color or code must be set, not both")

export type Annotation = z.infer<typeof AnnotationSchema>
export type AnnotationSuggestion = z.infer<typeof AnnotationSuggestionSchema>

export type StoredAnnotation = Annotation

export const DocumentMeta = z.object({
  tags: z.array(slug).optional().describe("Tag IDs from settings"),
  annotations: z.array(AnnotationSchema).optional(),
})

export type DocumentMeta = z.infer<typeof DocumentMeta>
export type DocumentMetaField = keyof DocumentMeta

export const fieldSchemas: { [K in DocumentMetaField]: z.ZodType<DocumentMeta[K]> } =
  DocumentMeta.shape as { [K in DocumentMetaField]: z.ZodType<DocumentMeta[K]> }

export const READONLY_FIELD_HINTS: Partial<Record<DocumentMetaField, string>> = {}

export const documentMetaFieldConfig = {
  schema: DocumentMeta,
  fieldSchemas,
  readonlyHints: READONLY_FIELD_HINTS,
} as const
