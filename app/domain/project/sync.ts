import type { AsyncDuckDB } from "@duckdb/duckdb-wasm"
import type { Project } from "./types"
import type { Document } from "../document"
import { insertRows, clearTable } from "~/lib/db/sync"
import { getCodingPayload } from "../plugins/coding"

const TABLES = ["annotations", "documents"] as const

type DocumentRow = {
  id: string
  name: string
  description: string
  title: string | null
  time: string | null
  updated_at: string
  pinned: boolean
  healthy: boolean
  version: number
}

type AnnotationRow = {
  id: string
  document_id: string
  text: string
  actor: string
  color: string
  reason: string | null
  code_id: string | null
  confidence: string | null
}

const selectDocumentRows = (project: Project): DocumentRow[] =>
  Object.values(project.documents).map(doc => ({
    id: doc.id,
    name: doc.name,
    description: doc.description,
    title: doc.title ?? null,
    time: doc.time ?? null,
    updated_at: doc.updated_at,
    pinned: doc.pinned,
    healthy: doc.healthy,
    version: doc.version,
  }))

const selectAnnotationRows = (project: Project): AnnotationRow[] =>
  Object.values(project.documents).flatMap(doc =>
    Object.values(doc.annotations).map(ann => {
      const payload = getCodingPayload(ann)
      return {
        id: ann.id,
        document_id: doc.id,
        text: ann.text,
        actor: ann.actor,
        color: ann.color,
        reason: ann.reason ?? null,
        code_id: payload?.code_id ?? null,
        confidence: payload?.confidence ?? null,
      }
    })
  )

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
    await insertRows(conn, "annotations", selectAnnotationRows(project))
  } finally {
    await conn.close()
  }
}
