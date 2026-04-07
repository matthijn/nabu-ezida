import { describe, it, expect } from "vitest"
import {
  extractEntityIdsFromRows,
  extractEntityIdsFromText,
  findEntityInRow,
  type ChartEntityMap,
} from "./entities"

const testEntity = (label: string, color: string): ChartEntityMap[string] => ({
  label,
  url: `/p/${label.toLowerCase()}`,
  textColor: color,
  backgroundColor: `${color}20`,
})

describe("extractEntityIdsFromRows", () => {
  const prefixes = ["annotation", "callout", "tag", "search"]

  const cases: {
    name: string
    rows: Record<string, unknown>[]
    prefixes: string[]
    expected: string[]
  }[] = [
    {
      name: "extracts entity IDs from string values",
      rows: [
        { id: "annotation-1abc2def", code: "Trust", count: 5 },
        { id: "annotation-2xyz3ghi", code: "Empathy", count: 3 },
      ],
      prefixes,
      expected: ["annotation-1abc2def", "annotation-2xyz3ghi"],
    },
    {
      name: "deduplicates across rows",
      rows: [
        { id: "annotation-1abc2def", count: 5 },
        { id: "annotation-1abc2def", count: 3 },
      ],
      prefixes,
      expected: ["annotation-1abc2def"],
    },
    {
      name: "ignores non-string values",
      rows: [{ id: 42, flag: true, nothing: null }],
      prefixes,
      expected: [],
    },
    {
      name: "ignores strings that do not match entity pattern",
      rows: [{ code: "Trust", color: "blue", file: "notes.md" }],
      prefixes,
      expected: [],
    },
    {
      name: "matches multiple prefix types",
      rows: [
        { a: "annotation-1abc2def", b: "callout-3xyz4ghi" },
        { a: "tag-5jkl6mno", b: "search-7pqr8stu" },
      ],
      prefixes,
      expected: ["annotation-1abc2def", "callout-3xyz4ghi", "tag-5jkl6mno", "search-7pqr8stu"],
    },
    {
      name: "returns empty for empty rows",
      rows: [],
      prefixes,
      expected: [],
    },
    {
      name: "returns empty for empty prefixes",
      rows: [{ id: "annotation-1abc2def" }],
      prefixes: [],
      expected: [],
    },
  ]

  cases.forEach(({ name, rows, prefixes: pref, expected }) => {
    it(name, () => {
      expect(extractEntityIdsFromRows(rows, pref).sort()).toEqual(expected.sort())
    })
  })
})

describe("extractEntityIdsFromText", () => {
  const prefixes = ["annotation", "callout", "tag"]

  const cases: {
    name: string
    text: string
    prefixes: string[]
    expected: string[]
  }[] = [
    {
      name: "finds entity IDs in prose",
      text: "See callout-bf01mech and annotation-1abc2def here",
      prefixes,
      expected: ["callout-bf01mech", "annotation-1abc2def"],
    },
    {
      name: "finds entity IDs in pipe table",
      text: "| callout-bf01mech | {count} |\n| tag-5jkl6mno | {total} |",
      prefixes,
      expected: ["callout-bf01mech", "tag-5jkl6mno"],
    },
    {
      name: "deduplicates",
      text: "callout-bf01mech and callout-bf01mech again",
      prefixes,
      expected: ["callout-bf01mech"],
    },
    {
      name: "ignores IDs preceded by word char",
      text: "xcallout-bf01mech should not match",
      prefixes,
      expected: [],
    },
    {
      name: "ignores IDs preceded by hyphen",
      text: "foo-callout-bf01mech should not match",
      prefixes,
      expected: [],
    },
    {
      name: "returns empty for empty prefixes",
      text: "callout-bf01mech",
      prefixes: [],
      expected: [],
    },
    {
      name: "returns empty for no matches",
      text: "no entity IDs here",
      prefixes,
      expected: [],
    },
  ]

  cases.forEach(({ name, text, prefixes: pref, expected }) => {
    it(name, () => {
      expect(extractEntityIdsFromText(text, pref).sort()).toEqual(expected.sort())
    })
  })
})

describe("findEntityInRow", () => {
  const entityMap: ChartEntityMap = {
    "annotation-1abc2def": testEntity("Trust", "#cd2b31"),
    "callout-3xyz4ghi": testEntity("Finding", "#1a6b2d"),
  }

  const cases: {
    name: string
    row: Record<string, unknown>
    expected: string | null
  }[] = [
    {
      name: "finds entity in row",
      row: { id: "annotation-1abc2def", count: 5 },
      expected: "Trust",
    },
    {
      name: "returns null when no entity matches",
      row: { code: "Trust", count: 5 },
      expected: null,
    },
    {
      name: "finds first matching entity",
      row: { a: "annotation-1abc2def", b: "callout-3xyz4ghi" },
      expected: "Trust",
    },
    {
      name: "ignores non-string values",
      row: { id: 42, flag: true },
      expected: null,
    },
  ]

  cases.forEach(({ name, row, expected }) => {
    it(name, () => {
      const result = findEntityInRow(row, entityMap)
      expect(result?.label ?? null).toBe(expected)
    })
  })
})
