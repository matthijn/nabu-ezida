export { type Result, ok, err, map, flatMap } from "~/lib/fp/result"
export {
  type JsonSchema,
  type DuckDbType,
  type DbColumn,
  type TableSchema,
  type DbError,
  type QueryResult,
  type Database,
} from "./types"
export { type ProjectionConfig } from "./projection"
export { jsonSchemaToTableProjection, tableSchemaToDdl, projectionToDdl } from "./ddl"
export { extractRows } from "./extract"
export { computeSyncPlan, syncFiles, type SyncPlan, type ProjectionWithSchema } from "./sync"
export { executeQuery } from "./query"
export { initializeDatabase } from "./init"
