import { ChartSchema, type ChartBlock } from "./schema"
import type { BlockTypeConfig, AsyncValidationContext } from "~/lib/data-blocks/definition"
import type { ValidationError } from "~/lib/data-blocks/validate"
import { getDatabase } from "~/domain/db/database"
import { executeQuery } from "~/lib/db/query"
import { resolveSqlPlaceholders } from "~/lib/db/resolve"
import { validateSqlEntityReferences } from "~/lib/data-blocks/ids"
import { getEntityPrefixes } from "~/lib/data-blocks/registry"
import { getFiles } from "~/lib/files/store"
import { getKnownEntityIds } from "~/domain/data-blocks/entity-ids"

const BLOCK = "json-chart"

const toQueryError = (message: string): ValidationError => ({
  block: BLOCK,
  field: "query",
  message,
})

const validateChartQuery = async (
  parsed: ChartBlock,
  context: AsyncValidationContext
): Promise<ValidationError[]> => {
  const db = getDatabase()
  if (!db) return []

  const sql = resolveSqlPlaceholders(parsed.query, { file: context.path })

  const refErrors = validateSqlEntityReferences(
    sql,
    getEntityPrefixes(),
    getKnownEntityIds(getFiles())
  )
  if (refErrors.length > 0) return refErrors.map(toQueryError)

  const result = await executeQuery(db.instance, sql)
  if (!result.ok) return [toQueryError(result.error.message)]
  return []
}

export const jsonChart: BlockTypeConfig<ChartBlock> = {
  schema: () => ChartSchema,
  readonly: [],
  immutable: {
    id: 'Field "id" is immutable',
  },
  constraints: [],
  renderer: "chart",
  singleton: false,
  projected: false,
  labelKey: "caption.label",
  captionType: "Figure",
  idPaths: [{ path: "id", prefix: "chart" }],
  asyncValidate: validateChartQuery,
}
