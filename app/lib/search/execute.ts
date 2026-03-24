import type { Database, DbError } from "~/lib/db/types"
import type { SearchHit } from "~/domain/search"
import type { Result } from "~/lib/fp/result"
import type { HybridSearchPlan } from "./semantic"
import type { ScoredChunk } from "./fusion"
import { ok, err } from "~/lib/fp/result"
import { buildCosineQuery, buildBm25Query, uniqueWords } from "./semantic"
import { fuseHybridResults } from "./fusion"
import { filterHits } from "./filter-hits"

type RawRow = Record<string, unknown>

const hasFileColumn = (row: RawRow): boolean => "file" in row

const toHit = (row: RawRow): SearchHit => ({
  file: String(row.file),
  ...(row.id !== undefined ? { id: String(row.id) } : {}),
  ...(row.text !== undefined ? { text: String(row.text) } : {}),
})

export const executeSearch = async (
  db: Database,
  sql: string
): Promise<Result<SearchHit[], DbError>> => {
  const result = await db.query<RawRow>(sql)
  if (!result.ok) return result

  const rows = result.value.rows
  if (rows.length === 0) return ok([])

  if (!hasFileColumn(rows[0])) {
    return err({ type: "query", message: "Query must SELECT a `file` column" })
  }

  return ok(rows.map(toHit))
}

const toScoredChunk = (row: RawRow, scoreKey: string): ScoredChunk => ({
  file: String(row.file),
  text: row.text !== undefined ? String(row.text) : undefined,
  hash: row.hash !== undefined ? String(row.hash) : undefined,
  score: Number(row[scoreKey] ?? 0),
})

const runScoredQuery = async (
  db: Database,
  sql: string,
  scoreKey: string
): Promise<Result<ScoredChunk[], DbError>> => {
  const result = await db.query<RawRow>(sql)
  if (!result.ok) return result
  return ok(result.value.rows.map((row) => toScoredChunk(row, scoreKey)))
}

const chunkToHit = (chunk: ScoredChunk): SearchHit => ({
  file: chunk.file,
  ...(chunk.text !== undefined ? { text: chunk.text } : {}),
})

const COSINE_KEY = "debug.search.cosine"
const BM25_KEY = "debug.search.bm25"

const isEnabled = (key: string): boolean => localStorage.getItem(key) !== "false"

export const executeHybridSearch = async (
  db: Database,
  plan: HybridSearchPlan
): Promise<Result<SearchHit[], DbError>> => {
  const useCosine = isEnabled(COSINE_KEY)
  const useBm25 = isEnabled(BM25_KEY)

  const cosinePerAngle: ScoredChunk[][] = []

  if (useCosine) {
    for (const angle of plan.angles) {
      const result = await runScoredQuery(
        db,
        buildCosineQuery(plan.baseSql, angle),
        "_semantic_score"
      )
      if (!result.ok) return result
      cosinePerAngle.push(result.value)
    }
  }

  let bm25: ScoredChunk[] = []
  if (useBm25) {
    const searchTerms = uniqueWords(plan.angles.map((a) => a.text))
    const bm25Result = await runScoredQuery(
      db,
      buildBm25Query(plan.baseSql, searchTerms),
      "_bm25_score"
    )
    if (!bm25Result.ok) return bm25Result
    bm25 = bm25Result.value
  }

  const fused = fuseHybridResults({ cosinePerAngle, bm25 }, plan.limit)
  const hits = fused.map(chunkToHit)
  const lenses = plan.angles.map((a) => a.text)
  const filtered = await filterHits(hits, plan.intent, lenses)
  console.debug("[HYBRID]", { before: hits.length, after: filtered.length })
  return ok(filtered)
}
