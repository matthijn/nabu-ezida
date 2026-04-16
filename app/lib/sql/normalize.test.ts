import { describe, it, expect } from "vitest"
import { normalizeLlmSql } from "./normalize"

const LF = "\n"
const CR = "\r"
const TAB = "\t"

describe("normalizeLlmSql", () => {
  const cases: { name: string; input: string; expected: string }[] = [
    { name: "empty string", input: "", expected: "" },
    {
      name: "clean single-line passes through",
      input: "SELECT a FROM t",
      expected: "SELECT a FROM t",
    },
    {
      name: "clean multi-line passes through",
      input: `SELECT a${LF}FROM t`,
      expected: `SELECT a${LF}FROM t`,
    },
    {
      name: "literal backslash-n outside quotes becomes LF",
      input: "SELECT a FROM t\\nWHERE x=1",
      expected: `SELECT a FROM t${LF}WHERE x=1`,
    },
    {
      name: "literal backslash-t outside quotes becomes TAB",
      input: "SELECT\\ta FROM t",
      expected: `SELECT${TAB}a FROM t`,
    },
    {
      name: "literal backslash-r outside quotes becomes CR",
      input: "SELECT a\\rFROM t",
      expected: `SELECT a${CR}FROM t`,
    },
    {
      name: "backslash-n inside single-quoted literal preserved",
      input: "SELECT x FROM t WHERE s='foo\\nbar'",
      expected: "SELECT x FROM t WHERE s='foo\\nbar'",
    },
    {
      name: "backslash-n inside double-quoted identifier preserved",
      input: 'SELECT "col\\nname" FROM t',
      expected: 'SELECT "col\\nname" FROM t',
    },
    {
      name: "backslash-n inside backtick identifier preserved",
      input: "SELECT `col\\nname` FROM t",
      expected: "SELECT `col\\nname` FROM t",
    },
    {
      name: "doubled single-quote keeps state inside string literal",
      input: "SELECT 'it''s\\nhere' AS x\\nFROM t",
      expected: `SELECT 'it''s\\nhere' AS x${LF}FROM t`,
    },
    {
      name: "backslash before non-escape char preserved",
      input: "SELECT \\x FROM t",
      expected: "SELECT \\x FROM t",
    },
    {
      name: "lone trailing backslash preserved",
      input: "SELECT a FROM t\\",
      expected: "SELECT a FROM t\\",
    },
    {
      name: "real LF outside and escaped backslash-n inside quotes",
      input: `SELECT x\\nFROM t WHERE s='has\\nescape'${LF}LIMIT 1`,
      expected: `SELECT x${LF}FROM t WHERE s='has\\nescape'${LF}LIMIT 1`,
    },
    {
      name: "original failing case fully normalized",
      input:
        "SELECT file, text FROM files \\nWHERE text ILIKE '%actieve herinnering%'\\n   OR text ILIKE '%niet herinneren%'\\n   OR text ILIKE '%niet meer weten%'\\n   OR SEMANTIC('Mark Rutte says he does not remember or has no active memory of a specific event, meeting, or detail')",
      expected: [
        "SELECT file, text FROM files ",
        "WHERE text ILIKE '%actieve herinnering%'",
        "   OR text ILIKE '%niet herinneren%'",
        "   OR text ILIKE '%niet meer weten%'",
        "   OR SEMANTIC('Mark Rutte says he does not remember or has no active memory of a specific event, meeting, or detail')",
      ].join(LF),
    },
  ]

  it.each(cases)("$name", ({ input, expected }) => {
    expect(normalizeLlmSql(input)).toBe(expected)
  })
})
