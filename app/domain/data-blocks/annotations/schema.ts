import { z } from "zod"
import { AnnotationSchema } from "~/domain/data-blocks/attributes/schema"

export const AnnotationsBlockSchema = z.object({
  annotations: z.array(AnnotationSchema),
})
export type AnnotationsBlock = z.infer<typeof AnnotationsBlockSchema>
