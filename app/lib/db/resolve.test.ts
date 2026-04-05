import { describe, it, expect } from "vitest"
import { resolveSqlPlaceholders } from "./resolve"

describe("resolveSqlPlaceholders", () => {
  const cases: { name: string; sql: string; file?: string; expected: string }[] = [
    {
      name: "replaces $file with quoted filename",
      sql: "SELECT * FROM annotations WHERE _file = $file",
      file: "notes.md",
      expected: "SELECT * FROM annotations WHERE _file = 'notes.md'",
    },
    {
      name: "replaces multiple $file occurrences",
      sql: "SELECT $file as name, * FROM annotations WHERE _file = $file",
      file: "test.md",
      expected: "SELECT 'test.md' as name, * FROM annotations WHERE _file = 'test.md'",
    },
    {
      name: "escapes single quotes in filename",
      sql: "SELECT * FROM annotations WHERE _file = $file",
      file: "it's a file.md",
      expected: "SELECT * FROM annotations WHERE _file = 'it''s a file.md'",
    },
    {
      name: "passes through sql without $file placeholder",
      sql: "SELECT code, COUNT(*) FROM annotations GROUP BY code",
      file: "notes.md",
      expected: "SELECT code, COUNT(*) FROM annotations GROUP BY code",
    },
    {
      name: "returns sql unchanged when no file context",
      sql: "SELECT * FROM annotations WHERE _file = $file",
      file: undefined,
      expected: "SELECT * FROM annotations WHERE _file = $file",
    },
  ]

  cases.forEach(({ name, sql, file, expected }) => {
    it(name, () => {
      expect(resolveSqlPlaceholders(sql, { file })).toBe(expected)
    })
  })
})
