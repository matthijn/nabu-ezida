import { DocumentMeta } from "./schema"
import type { BlockTypeConfig } from "~/lib/data-blocks/definition"
import type { ValidationContext } from "~/lib/data-blocks/validate"
import { validateTags } from "./tags/validation"
import { validateAnnotations, patchAnnotationRequired } from "./annotations/validation"

export const jsonAttributes: BlockTypeConfig<DocumentMeta, ValidationContext> = {
  schema: DocumentMeta,
  readonly: ["language"],
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
  fuzzyFields: ["annotations.*.text"],
  patchSchema: patchAnnotationRequired,
  validate: (parsed, context) => [
    ...validateTags(parsed.tags, context),
    ...validateAnnotations(parsed.annotations, context),
  ],
}
