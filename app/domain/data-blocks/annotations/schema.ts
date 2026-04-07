import { z } from "zod"
import { annotationSchema } from "~/domain/data-blocks/attributes/schema"
import type { ValidationContext } from "~/lib/data-blocks/definition"

export const annotationsBlockSchema = (ctx?: ValidationContext) =>
  z.object({ annotations: z.array(annotationSchema(ctx)) })

export const AnnotationsBlockSchema = annotationsBlockSchema()
export type AnnotationsBlock = z.infer<typeof AnnotationsBlockSchema>
