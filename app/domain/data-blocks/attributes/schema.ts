import type { ComponentType } from "react"
import { z } from "zod"
import { FeatherHighlighter } from "@subframe/core"
import { BLOCK_COLORS } from "~/domain/colors"
import { emptyToUndefined } from "~/lib/data-blocks/field-validate"

export const annotationIcon: ComponentType<{ className?: string }> = FeatherHighlighter

export const slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)
export const radixColor = z.enum(BLOCK_COLORS as [string, ...string[]])

const hasColorOrCode = (a: { color?: unknown; code?: unknown }) =>
  (a.color !== undefined) !== (a.code !== undefined)

export const AnnotationSchema = z
  .object({
    text: z.string().describe("Exact text from the document"),
    reason: z.string().describe("Why this text was annotated"),
    color: emptyToUndefined(radixColor).describe("Color for the annotation (if no code)"),
    code: emptyToUndefined(z.string()).describe("Code ID from codebook (if no color)"),
    review: z
      .string()
      .optional()
      .describe("Flags the annotation for human review — explain what needs attention"),
    id: z.string().optional(),
    actor: z.enum(["ai", "user"]).optional(),
  })
  .refine(hasColorOrCode, "Either color or code must be set, not both")

export type Annotation = z.infer<typeof AnnotationSchema>

export const DocumentMeta = z.object({
  tags: z.array(slug).optional().describe("Tag IDs from settings"),
  annotations: z.array(AnnotationSchema).optional(),
})

export type DocumentMeta = z.infer<typeof DocumentMeta>
