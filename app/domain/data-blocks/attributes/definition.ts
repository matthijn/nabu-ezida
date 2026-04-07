import { documentMetaSchema, type DocumentMeta } from "./schema"
import type { BlockTypeConfig } from "~/lib/data-blocks/definition"

export const jsonAttributes: BlockTypeConfig<DocumentMeta> = {
  schema: documentMetaSchema,
  readonly: ["type", "source", "subject"],
  immutable: {},
  constraints: ["tags: must be tag IDs defined in settings"],
  renderer: "hidden",
  singleton: true,
  projected: true,
}
