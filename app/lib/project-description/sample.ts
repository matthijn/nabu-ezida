import type { Database } from "~/lib/db/types"
import type { Result } from "~/lib/fp/result"
import type { DbError } from "~/lib/db/types"
import { CHARS_PER_TOKEN } from "~/lib/embeddings/constants"

const MAX_SAMPLE_TOKENS = 2500
const MAX_SAMPLE_CHARS = MAX_SAMPLE_TOKENS * CHARS_PER_TOKEN
const MAX_PASSAGE_CHARS = 200

const SAMPLE_SQL = `SELECT text FROM files ORDER BY RANDOM()`

interface SampleRow {
  text: string
}

const takeUntilBudget = (rows: SampleRow[]): string[] => {
  const passages: string[] = []
  let chars = 0
  for (const row of rows) {
    const passage = row.text.slice(0, MAX_PASSAGE_CHARS)
    if (chars + passage.length > MAX_SAMPLE_CHARS) break
    passages.push(passage)
    chars += passage.length
  }
  return passages
}

export const samplePassages = async (db: Database): Promise<Result<string[], DbError>> => {
  const result = await db.query<SampleRow>(SAMPLE_SQL)
  if (!result.ok) return result
  return { ok: true, value: takeUntilBudget(result.value.rows) }
}
