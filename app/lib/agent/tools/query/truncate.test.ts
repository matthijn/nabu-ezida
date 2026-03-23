import { describe, it, expect } from "vitest"
import { capRows, type CapResult } from "./truncate"

type Row = Record<string, unknown>

interface TestCase {
  name: string
  rows: Row[]
  maxRows: number
  expected: CapResult
}

const cases: TestCase[] = [
  {
    name: "within limit returns unchanged",
    rows: [{ file: "a.md", count: 3 }],
    maxRows: 50,
    expected: {
      rows: [{ file: "a.md", count: 3 }],
      capped: false,
    },
  },
  {
    name: "caps rows when exceeding max",
    rows: [{ file: "a.md" }, { file: "b.md" }, { file: "c.md" }],
    maxRows: 2,
    expected: {
      rows: [{ file: "a.md" }, { file: "b.md" }],
      capped: true,
    },
  },
  {
    name: "preserves all value types unchanged",
    rows: [{ file: "a.md", text: "A".repeat(500), count: 42, active: true, tags: null }],
    maxRows: 50,
    expected: {
      rows: [{ file: "a.md", text: "A".repeat(500), count: 42, active: true, tags: null }],
      capped: false,
    },
  },
  {
    name: "empty rows",
    rows: [],
    maxRows: 50,
    expected: {
      rows: [],
      capped: false,
    },
  },
  {
    name: "exact limit not capped",
    rows: [{ file: "a.md" }, { file: "b.md" }],
    maxRows: 2,
    expected: {
      rows: [{ file: "a.md" }, { file: "b.md" }],
      capped: false,
    },
  },
]

describe("capRows", () => {
  it.each(cases)("$name", ({ rows, maxRows, expected }) => {
    expect(capRows(rows, maxRows)).toEqual(expected)
  })
})
