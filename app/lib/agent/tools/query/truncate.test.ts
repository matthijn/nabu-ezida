import { describe, it, expect } from "vitest"
import { truncateRows, type TruncateResult } from "./truncate"

type Row = Record<string, unknown>

interface TestCase {
  name: string
  rows: Row[]
  maxRows: number
  maxTextLength: number
  expected: TruncateResult
}

const cases: TestCase[] = [
  {
    name: "within limits returns unchanged",
    rows: [{ file: "a.md", count: 3 }],
    maxRows: 50,
    maxTextLength: 200,
    expected: {
      rows: [{ file: "a.md", count: 3 }],
      truncated: false,
    },
  },
  {
    name: "caps rows when exceeding max",
    rows: [{ file: "a.md" }, { file: "b.md" }, { file: "c.md" }],
    maxRows: 2,
    maxTextLength: 200,
    expected: {
      rows: [{ file: "a.md" }, { file: "b.md" }],
      truncated: true,
    },
  },
  {
    name: "truncates long strings",
    rows: [{ file: "a.md", text: "A".repeat(250) }],
    maxRows: 50,
    maxTextLength: 10,
    expected: {
      rows: [{ file: "a.md", text: "A".repeat(10) + "..." }],
      truncated: false,
    },
  },
  {
    name: "preserves non-string values",
    rows: [{ file: "a.md", count: 42, active: true, tags: null }],
    maxRows: 50,
    maxTextLength: 200,
    expected: {
      rows: [{ file: "a.md", count: 42, active: true, tags: null }],
      truncated: false,
    },
  },
  {
    name: "empty rows",
    rows: [],
    maxRows: 50,
    maxTextLength: 200,
    expected: {
      rows: [],
      truncated: false,
    },
  },
  {
    name: "caps and truncates together",
    rows: [{ text: "X".repeat(300) }, { text: "Y".repeat(300) }, { text: "Z".repeat(300) }],
    maxRows: 2,
    maxTextLength: 5,
    expected: {
      rows: [{ text: "X".repeat(5) + "..." }, { text: "Y".repeat(5) + "..." }],
      truncated: true,
    },
  },
]

describe("truncateRows", () => {
  it.each(cases)("$name", ({ rows, maxRows, maxTextLength, expected }) => {
    expect(truncateRows(rows, maxRows, maxTextLength)).toEqual(expected)
  })
})
