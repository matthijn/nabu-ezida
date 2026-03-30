import { DocumentMeta } from "./schema"
import type { BlockTypeConfig } from "~/lib/data-blocks/definition"
import type { ValidationContext } from "~/lib/data-blocks/validate"
import { validateTags } from "./tags/validation"

export const jsonAttributes: BlockTypeConfig<DocumentMeta, ValidationContext> = {
  schema: DocumentMeta,
  readonly: ["type", "source", "subject"],
  immutable: {},
  constraints: ["tags: must be tag IDs defined in settings"],
  renderer: "hidden",
  singleton: true,
  validate: (parsed, context) => validateTags(parsed.tags, context),
}
