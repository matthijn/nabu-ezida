import { describe, it, expect } from "vitest"
import type { Table, Vector } from "apache-arrow"
import { coerceValue, rowsToArrowTable } from "./arrow"
import type { DbColumn, DuckDbType } from "./types"

const getColumn = (table: Table, name: string): Vector => {
  const col = table.getChild(name)
  if (!col) throw new Error(`Missing column: ${name}`)
  return col
}

describe("coerceValue", () => {
  const cases: { name: string; type: DuckDbType; input: unknown; expected: unknown }[] = [
    {
      name: "DATE: ISO date string",
      type: "DATE",
      input: "2024-01-15",
      expected: new Date("2024-01-15"),
    },
    { name: "DATE: empty string → null", type: "DATE", input: "", expected: null },
    { name: "DATE: null stays null", type: "DATE", input: null, expected: null },
    { name: "DATE: undefined → null", type: "DATE", input: undefined, expected: null },
    { name: "DATE: invalid string → null", type: "DATE", input: "not-a-date", expected: null },
    {
      name: "DATE: Date instance passes through",
      type: "DATE",
      input: new Date("2024-06-01"),
      expected: new Date("2024-06-01"),
    },
    { name: "INTEGER: number passes through", type: "INTEGER", input: 42, expected: 42 },
    { name: "INTEGER: null stays null", type: "INTEGER", input: null, expected: null },
    { name: "VARCHAR: string passes through", type: "VARCHAR", input: "hello", expected: "hello" },
    { name: "BOOLEAN: true passes through", type: "BOOLEAN", input: true, expected: true },
    {
      name: "VARCHAR[]: array passes through",
      type: "VARCHAR[]",
      input: ["a", "b"],
      expected: ["a", "b"],
    },
  ]

  it.each(cases)("$name", ({ type, input, expected }) => {
    expect(coerceValue(type, input)).toEqual(expected)
  })
})

describe("rowsToArrowTable", () => {
  const dateColumns: DbColumn[] = [
    { name: "file", type: "VARCHAR", nullable: false },
    { name: "date", type: "DATE", nullable: true },
  ]

  interface Case {
    name: string
    columns: DbColumn[]
    rows: Record<string, unknown>[]
    check: (table: Table) => void
  }

  const cases: Case[] = [
    {
      name: "builds a DATE column from ISO strings",
      columns: dateColumns,
      rows: [
        { file: "a.md", date: "2024-01-15" },
        { file: "b.md", date: "2024-06-20" },
      ],
      check: (table) => {
        const dateCol = getColumn(table, "date")
        expect(dateCol.type.toString()).toContain("Date")
        expect(dateCol.get(0)).toBe(new Date("2024-01-15").getTime())
        expect(dateCol.get(1)).toBe(new Date("2024-06-20").getTime())
      },
    },
    {
      name: "packs null dates as null in a DATE column",
      columns: dateColumns,
      rows: [
        { file: "a.md", date: null },
        { file: "b.md", date: "2024-06-20" },
        { file: "c.md", date: "" },
      ],
      check: (table) => {
        const dateCol = getColumn(table, "date")
        expect(dateCol.get(0)).toBeNull()
        expect(dateCol.get(1)).toBe(new Date("2024-06-20").getTime())
        expect(dateCol.get(2)).toBeNull()
      },
    },
    {
      name: "handles an all-null DATE column",
      columns: dateColumns,
      rows: [
        { file: "a.md", date: null },
        { file: "b.md", date: null },
      ],
      check: (table) => {
        const dateCol = getColumn(table, "date")
        expect(dateCol.type.toString()).toContain("Date")
        expect(dateCol.get(0)).toBeNull()
        expect(dateCol.get(1)).toBeNull()
      },
    },
    {
      name: "preserves existing types (integer, varchar) alongside date",
      columns: [
        { name: "file", type: "VARCHAR", nullable: false },
        { name: "count", type: "INTEGER", nullable: true },
        { name: "date", type: "DATE", nullable: true },
      ],
      rows: [
        { file: "a.md", count: 3, date: "2024-01-15" },
        { file: "b.md", count: null, date: null },
      ],
      check: (table) => {
        expect(getColumn(table, "count").get(0)).toBe(3)
        expect(getColumn(table, "count").get(1)).toBeNull()
        expect(getColumn(table, "date").get(0)).toBe(new Date("2024-01-15").getTime())
        expect(getColumn(table, "date").get(1)).toBeNull()
      },
    },
  ]

  it.each(cases)("$name", ({ columns, rows, check }) => {
    check(rowsToArrowTable(columns, rows))
  })
})
