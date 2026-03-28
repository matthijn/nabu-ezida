import { vectorFromArray, Table, Field, Float32, Utf8, Bool, Int32, List } from "apache-arrow"
import type { DataType, Vector } from "apache-arrow"
import type { DbColumn, DuckDbType } from "./types"

const FLOAT_LIST = new List(Field.new({ name: "item", type: new Float32(), nullable: true }))
const STRING_LIST = new List(Field.new({ name: "item", type: new Utf8(), nullable: true }))

const ARROW_TYPES: Record<DuckDbType, DataType> = {
  VARCHAR: new Utf8(),
  BOOLEAN: new Bool(),
  INTEGER: new Int32(),
  "FLOAT[]": FLOAT_LIST,
  "VARCHAR[]": STRING_LIST,
}

const arrowType = (type: DuckDbType): DataType => {
  const t = ARROW_TYPES[type]
  if (!t) throw new Error(`Unsupported DuckDB type: ${type}`)
  return t
}

const columnValues = (name: string, rows: Record<string, unknown>[]): unknown[] =>
  rows.map((r) => r[name] ?? null)

export const rowsToArrowTable = (columns: DbColumn[], rows: Record<string, unknown>[]): Table => {
  const vectors: Record<string, Vector> = {}
  for (const col of columns) {
    vectors[col.name] = vectorFromArray(columnValues(col.name, rows), arrowType(col.type))
  }
  return new Table(vectors)
}
