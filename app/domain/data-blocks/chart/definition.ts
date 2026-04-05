import { ChartSchema } from "./schema"
import type { BlockTypeConfig } from "~/lib/data-blocks/definition"

export const jsonChart: BlockTypeConfig = {
  schema: ChartSchema,
  readonly: [],
  immutable: {
    id: 'Field "id" is immutable',
  },
  constraints: [],
  renderer: "chart",
  singleton: false,
  projected: false,
  labelKey: "title",
  idPaths: [{ path: "id", prefix: "chart" }],
}
