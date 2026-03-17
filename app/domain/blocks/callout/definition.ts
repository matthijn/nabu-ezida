import { CalloutSchema } from "./schema"
import type { BlockTypeConfig } from "~/lib/blocks/definition"

export const jsonCallout: BlockTypeConfig = {
  schema: CalloutSchema,
  readonly: [],
  immutable: {
    id: 'Field "id" is immutable and cannot be changed',
  },
  constraints: [],
  renderer: "callout",
  singleton: false,
  labelKey: "title",
  idPaths: [{ path: "id", prefix: "callout" }],
  actorPaths: [{ path: "actor" }],
}
