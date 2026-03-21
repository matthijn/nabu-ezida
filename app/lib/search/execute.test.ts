import { describe, it, expect } from "vitest"
import { executeSearchQueries } from "./execute"
import type { Database, QueryResult, DbError } from "~/lib/db/types"
import type { SearchQuery, SearchHit } from "~/domain/search"
import type { Result } from "~/lib/fp/result"
import { ok, err } from "~/lib/fp/result"

type RawRow = Record<string, unknown>

const createTestDb = (
  handler: (sql: string) => Result<QueryResult<RawRow>, DbError>
): Database => ({
  instance: {} as Database["instance"],
  query: async <T = unknown>(sql: string) => handler(sql) as Result<QueryResult<T>, DbError>,
})

const successDb = (rows: RawRow[]): Database =>
  createTestDb(() => ok({ rows, rowCount: rows.length }))

const failDb = (error: DbError): Database => createTestDb(() => err(error))

const multiDb = (responses: Result<QueryResult<RawRow>, DbError>[]): Database => {
  let callIndex = 0
  return createTestDb(() => {
    const response = responses[callIndex]
    callIndex++
    return response
  })
}

interface TestCase {
  name: string
  db: Database
  queries: SearchQuery[]
  expected: Result<SearchHit[], DbError>
}

const cases: TestCase[] = [
  {
    name: "single file query returns file hits",
    db: successDb([{ file: "doc1.md" }, { file: "doc2.md" }]),
    queries: [{ type: "file", sql: "SELECT file FROM files" }],
    expected: ok([
      { type: "file", file: "doc1.md" },
      { type: "file", file: "doc2.md" },
    ]),
  },
  {
    name: "single hit query returns hit results",
    db: successDb([
      { file: "doc1.md", id: "annotation-abc" },
      { file: "doc2.md", id: "callout-def" },
    ]),
    queries: [{ type: "hit", sql: "SELECT file, id FROM callout" }],
    expected: ok([
      { type: "hit", file: "doc1.md", id: "annotation-abc" },
      { type: "hit", file: "doc2.md", id: "callout-def" },
    ]),
  },
  {
    name: "empty result set returns empty array",
    db: successDb([]),
    queries: [{ type: "file", sql: "SELECT file FROM files WHERE 1=0" }],
    expected: ok([]),
  },
  {
    name: "missing file column returns error",
    db: successDb([{ name: "doc1.md" }]),
    queries: [{ type: "file", sql: "SELECT name FROM files" }],
    expected: err({ type: "query", message: 'Missing columns for type "file": file' }),
  },
  {
    name: "missing id column for hit type returns error",
    db: successDb([{ file: "doc1.md" }]),
    queries: [{ type: "hit", sql: "SELECT file FROM callout" }],
    expected: err({ type: "query", message: 'Missing columns for type "hit": id' }),
  },
  {
    name: "db error propagates",
    db: failDb({ type: "query", message: "syntax error" }),
    queries: [{ type: "file", sql: "INVALID SQL" }],
    expected: err({ type: "query", message: "syntax error" }),
  },
  {
    name: "deduplicates identical file hits across queries",
    db: multiDb([
      ok({ rows: [{ file: "doc1.md" }, { file: "doc2.md" }], rowCount: 2 }),
      ok({ rows: [{ file: "doc2.md" }, { file: "doc3.md" }], rowCount: 2 }),
    ]),
    queries: [
      { type: "file", sql: "SELECT file FROM files WHERE file LIKE '%1%'" },
      { type: "file", sql: "SELECT file FROM files WHERE file LIKE '%2%'" },
    ],
    expected: ok([
      { type: "file", file: "doc1.md" },
      { type: "file", file: "doc2.md" },
      { type: "file", file: "doc3.md" },
    ]),
  },
  {
    name: "second query failure stops and returns error",
    db: multiDb([
      ok({ rows: [{ file: "doc1.md" }], rowCount: 1 }),
      err({ type: "query", message: "table not found" }),
    ]),
    queries: [
      { type: "file", sql: "SELECT file FROM files" },
      { type: "file", sql: "SELECT file FROM missing_table" },
    ],
    expected: err({ type: "query", message: "table not found" }),
  },
  {
    name: "no queries returns empty array",
    db: successDb([]),
    queries: [],
    expected: ok([]),
  },
]

describe("executeSearchQueries", () => {
  it.each(cases)("$name", async ({ db, queries, expected }) => {
    const result = await executeSearchQueries(db, queries)
    expect(result).toEqual(expected)
  })
})
