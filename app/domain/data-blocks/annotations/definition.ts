import { AnnotationsBlockSchema, type AnnotationsBlock } from "./schema"
import type { BlockTypeConfig } from "~/lib/data-blocks/definition"
import type { ValidationContext } from "~/lib/data-blocks/validate"
import {
  validateAnnotations,
  patchAnnotationRequired,
} from "~/domain/data-blocks/attributes/annotations/validation"

export const jsonAnnotations: BlockTypeConfig<AnnotationsBlock, ValidationContext> = {
  schema: AnnotationsBlockSchema,
  readonly: [],
  immutable: {},
  constraints: [
    "each entry requires either 'color' or 'code', not both",
    "text: must be text from the document prose (fuzzy-matched automatically)",
  ],
  renderer: "hidden",
  singleton: true,
  idPaths: [{ path: "*.id", prefix: "annotation" }],
  actorPaths: [{ path: "*.actor" }],
  fuzzyFields: ["*.text"],
  patchSchema: patchAnnotationRequired,
  validate: (parsed, context) => validateAnnotations(parsed, context),
}
