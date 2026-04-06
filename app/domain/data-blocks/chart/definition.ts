import { ChartSchema, type ChartBlock } from "./schema"
import type { BlockTypeConfig, AsyncValidationContext } from "~/lib/data-blocks/definition"
import type { ValidationError } from "~/lib/data-blocks/validate"
import { getDatabase } from "~/domain/db/database"
import { executeQuery } from "~/lib/db/query"
import { resolveSqlPlaceholders } from "~/lib/db/resolve"

const validateChartQuery = async (
  parsed: ChartBlock,
  context: AsyncValidationContext
): Promise<ValidationError[]> => {
  const db = getDatabase()
  if (!db) return []

  const sql = resolveSqlPlaceholders(parsed.query, { file: context.path })
  const result = await executeQuery(db.instance, sql)
  if (!result.ok) return [{ block: "json-chart", field: "query", message: result.error.message }]
  return []
}

export const jsonChart: BlockTypeConfig<ChartBlock> = {
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
  asyncValidate: validateChartQuery,
}
