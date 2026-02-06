import { z } from "zod"
import { BLOCK_COLORS } from "~/lib/colors/radix"

const slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)
const radixColor = z.enum(BLOCK_COLORS as [string, ...string[]])

const emptyToUndefined = <T>(schema: z.ZodType<T>): z.ZodType<T | undefined> =>
  z.preprocess((v) => (v === "" ? undefined : v), schema.optional()) as z.ZodType<T | undefined>

const AmbiguitySchema = z.object({
  description: z.string().describe("Why the interpretation is uncertain"),
  confidence: z.enum(["low", "medium", "high"]).describe("How confident the interpretation is"),
  feedback: z.string().optional().describe("User's note on resolution"),
})

const colorOrCodeRefinement = (a: { color?: unknown; code?: unknown }) =>
  (a.color !== undefined) !== (a.code !== undefined)

const colorOrCodeMessage = { message: "Either color or code must be set, not both" }

const AnnotationBase = z.object({
  text: z.string().describe("Exact text from the document"),
  reason: z.string().describe("Why this text was annotated"),
  color: emptyToUndefined(radixColor).describe("Color for the annotation (if no code)"),
  code: emptyToUndefined(z.string()).describe("Code ID from codebook (if no color)"),
  ambiguity: AmbiguitySchema.optional(),
})

export const AnnotationSchema = AnnotationBase
  .extend({
    id: z.string().optional(),
    status: z.enum(["accepted", "rejected", "resolved-locally", "merged"]).optional(),
    pending: z.enum(["pending_change", "pending_deletion"]).optional(),
  })
  .refine(colorOrCodeRefinement, colorOrCodeMessage)

export const AnnotationSuggestionSchema = AnnotationBase
  .extend({ deleteSuggested: z.boolean().describe("Whether this annotation should be removed") })
  .refine(colorOrCodeRefinement, colorOrCodeMessage)

export type Annotation = z.infer<typeof AnnotationSchema>
export type AnnotationSuggestion = z.infer<typeof AnnotationSuggestionSchema>

// Backwards compat aliases
export type StoredAnnotation = Annotation
export type AnnotationInput = Annotation

const tagsSchema = z.array(slug).optional()
const annotationsSchema = z.array(AnnotationSchema).optional()

export const DocumentMeta = z.object({
  tags: tagsSchema,
  annotations: annotationsSchema,
})

export type DocumentMeta = z.infer<typeof DocumentMeta>
export type DocumentMetaField = keyof DocumentMeta

export const fieldSchemas: { [K in DocumentMetaField]: z.ZodType<DocumentMeta[K]> } = {
  tags: tagsSchema,
  annotations: annotationsSchema,
}

export const READONLY_FIELD_HINTS: Partial<Record<DocumentMetaField, string>> = {}
