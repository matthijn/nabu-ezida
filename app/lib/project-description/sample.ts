import type { Database } from "~/lib/db/types"
import type { Result } from "~/lib/fp/result"
import type { DbError } from "~/lib/db/types"

export interface LanguageSample {
  language: string
  passages: string[]
}

const SAMPLES_PER_LANGUAGE = 20

const SAMPLE_SQL = `
SELECT * FROM (
  SELECT text, COALESCE(language, 'unknown') AS language,
    ROW_NUMBER() OVER (PARTITION BY COALESCE(language, 'unknown') ORDER BY RANDOM()) AS rn
  FROM files
) WHERE rn <= ${SAMPLES_PER_LANGUAGE}
`

interface SampleRow {
  text: string
  language: string
}

const groupByLanguage = (rows: SampleRow[]): LanguageSample[] => {
  const map = new Map<string, string[]>()
  for (const row of rows) {
    const existing = map.get(row.language) ?? []
    existing.push(row.text)
    map.set(row.language, existing)
  }
  return [...map.entries()].map(([language, passages]) => ({ language, passages }))
}

export const sampleByLanguage = async (
  db: Database
): Promise<Result<LanguageSample[], DbError>> => {
  const result = await db.query<SampleRow>(SAMPLE_SQL)
  if (!result.ok) return result
  return { ok: true, value: groupByLanguage(result.value.rows) }
}
