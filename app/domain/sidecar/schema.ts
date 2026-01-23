import { z } from "zod"
import { BLOCK_COLORS } from "~/lib/colors/radix"

const slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)
const radixColor = z.enum(BLOCK_COLORS as [string, ...string[]])

const AnnotationSchema = z.object({
  text: z.string(),
  reason: z.string(),
  color: radixColor.optional(),
  code: z.string().optional(),
}).refine(
  (a) => (a.color !== undefined) !== (a.code !== undefined),
  { message: "Either color or code must be set, not both" }
)

const tagsSchema = z.array(slug).optional()
const annotationsSchema = z.array(AnnotationSchema).optional()

export const DocumentMeta = z.object({
  tags: tagsSchema,
  annotations: annotationsSchema,
})

export type DocumentMeta = z.infer<typeof DocumentMeta>
export type SidecarAnnotation = z.infer<typeof AnnotationSchema>
export type DocumentMetaField = keyof DocumentMeta

export const fieldSchemas: { [K in DocumentMetaField]: z.ZodType<DocumentMeta[K]> } = {
  tags: tagsSchema,
  annotations: annotationsSchema,
}

export const READONLY_FIELD_HINTS: Partial<Record<DocumentMetaField, string>> = {
  annotations: "Use /annotate endpoint to manage annotations",
}
