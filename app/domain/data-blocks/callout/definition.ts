import { CalloutSchema } from "./schema"
import type { BlockTypeConfig } from "~/lib/data-blocks/definition"

export const jsonCallout: BlockTypeConfig = {
  schema: () => CalloutSchema,
  readonly: [],
  immutable: {
    id: 'Field "id" is immutable and cannot be changed',
  },
  constraints: [],
  renderer: "callout",
  singleton: false,
  projected: true,
  labelKey: "title",
  idPaths: [{ path: "id", prefix: "callout" }],
  actorPaths: [{ path: "actor" }],
}
