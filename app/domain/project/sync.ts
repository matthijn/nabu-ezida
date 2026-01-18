import type { AsyncDuckDB } from "@duckdb/duckdb-wasm"
import type { Project } from "./types"
import {
  selectDocumentRows,
  selectBlockRows,
  selectAnnotationRows,
} from "./selectors"
import { insertRows, clearTable } from "~/lib/db/sync"

const TABLES = ["annotations", "blocks", "documents"] as const

export const syncProjectToDatabase = async (
  db: AsyncDuckDB,
  project: Project
): Promise<void> => {
  const conn = await db.connect()

  try {
    for (const table of TABLES) {
      await clearTable(conn, table)
    }

    await insertRows(conn, "documents", selectDocumentRows(project))
    await insertRows(conn, "blocks", selectBlockRows(project))
    await insertRows(conn, "annotations", selectAnnotationRows(project))
  } finally {
    await conn.close()
  }
}
