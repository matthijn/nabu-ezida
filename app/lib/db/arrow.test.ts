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

  cases.forEach(({ name, type, input, expected }) => {
    it(name, () => {
      expect(coerceValue(type, input)).toEqual(expected)
    })
  })
})

describe("rowsToArrowTable", () => {
  const dateColumns: DbColumn[] = [
    { name: "file", type: "VARCHAR", nullable: false },
    { name: "date", type: "DATE", nullable: true },
  ]

  it("builds a DATE column from ISO strings", () => {
    const rows = [
      { file: "a.md", date: "2024-01-15" },
      { file: "b.md", date: "2024-06-20" },
    ]
    const table = rowsToArrowTable(dateColumns, rows)
    const dateCol = getColumn(table, "date")
    expect(dateCol.type.toString()).toContain("Date")
    expect(dateCol.get(0)).toBe(new Date("2024-01-15").getTime())
    expect(dateCol.get(1)).toBe(new Date("2024-06-20").getTime())
  })

  it("packs null dates as null in a DATE column", () => {
    const rows = [
      { file: "a.md", date: null },
      { file: "b.md", date: "2024-06-20" },
      { file: "c.md", date: "" },
    ]
    const table = rowsToArrowTable(dateColumns, rows)
    const dateCol = getColumn(table, "date")
    expect(dateCol.get(0)).toBeNull()
    expect(dateCol.get(1)).toBe(new Date("2024-06-20").getTime())
    expect(dateCol.get(2)).toBeNull()
  })

  it("handles an all-null DATE column", () => {
    const rows = [
      { file: "a.md", date: null },
      { file: "b.md", date: null },
    ]
    const table = rowsToArrowTable(dateColumns, rows)
    const dateCol = getColumn(table, "date")
    expect(dateCol.type.toString()).toContain("Date")
    expect(dateCol.get(0)).toBeNull()
    expect(dateCol.get(1)).toBeNull()
  })

  it("preserves existing types (integer, varchar) alongside date", () => {
    const columns: DbColumn[] = [
      { name: "file", type: "VARCHAR", nullable: false },
      { name: "count", type: "INTEGER", nullable: true },
      { name: "date", type: "DATE", nullable: true },
    ]
    const rows = [
      { file: "a.md", count: 3, date: "2024-01-15" },
      { file: "b.md", count: null, date: null },
    ]
    const table = rowsToArrowTable(columns, rows)
    expect(getColumn(table, "count").get(0)).toBe(3)
    expect(getColumn(table, "count").get(1)).toBeNull()
    expect(getColumn(table, "date").get(0)).toBe(new Date("2024-01-15").getTime())
    expect(getColumn(table, "date").get(1)).toBeNull()
  })
})
