import type { JsonSchema } from "./types"

interface TableRows {
  table: string
  rows: Record<string, unknown>[]
}

const isObjectArray = (prop: JsonSchema): boolean =>
  prop.type === "array" && prop.items?.type === "object"

const extractScalars = (
  schema: JsonSchema,
  data: Record<string, unknown>,
  filename: string
): Record<string, unknown> => {
  const properties = schema.properties ?? {}
  const row: Record<string, unknown> = { file: filename }

  for (const [field, prop] of Object.entries(properties)) {
    if (isObjectArray(prop)) continue
    row[field] = data[field] ?? null
  }

  return row
}

const extractChildRows = (
  parentName: string,
  field: string,
  items: unknown[],
  itemSchema: JsonSchema,
  filename: string
): TableRows => ({
  table: `${parentName}_${field}`,
  rows: items.map((item) => extractScalars(itemSchema, item as Record<string, unknown>, filename)),
})

export const extractRows = (
  tableName: string,
  jsonSchema: JsonSchema,
  data: unknown,
  filename: string
): TableRows[] => {
  const obj = data as Record<string, unknown>
  const rootRow = extractScalars(jsonSchema, obj, filename)
  const result: TableRows[] = [{ table: tableName, rows: [rootRow] }]
  const properties = jsonSchema.properties ?? {}

  for (const [field, prop] of Object.entries(properties)) {
    if (!isObjectArray(prop)) continue

    const items = obj[field]
    if (!Array.isArray(items) || items.length === 0) continue

    if (!prop.items) throw new Error(`Object array ${field} missing items schema`)
    result.push(extractChildRows(tableName, field, items, prop.items, filename))
  }

  return result
}
