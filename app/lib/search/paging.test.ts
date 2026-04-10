import { describe, it, expect } from "vitest"
import {
  extractLimit,
  capLimit,
  hasOffset,
  dropOffset,
  stripPaging,
  type LimitRewrite,
} from "./paging"

describe("extractLimit", () => {
  const cases: { name: string; sql: string; expected: number | undefined }[] = [
    { name: "explicit LIMIT", sql: "SELECT file FROM f LIMIT 25", expected: 25 },
    { name: "no LIMIT returns undefined", sql: "SELECT file FROM f", expected: undefined },
    {
      name: "LIMIT at end of complex query",
      sql: "SELECT file FROM f WHERE x = 1 ORDER BY file LIMIT 100",
      expected: 100,
    },
    { name: "case insensitive", sql: "select file from f limit 7", expected: 7 },
  ]

  it.each(cases)("$name", ({ sql, expected }) => {
    expect(extractLimit(sql)).toBe(expected)
  })
})

describe("capLimit", () => {
  const cases: {
    name: string
    sql: string
    max: number
    expected: LimitRewrite
  }[] = [
    {
      name: "no LIMIT → injects LIMIT max",
      sql: "SELECT file FROM f",
      max: 50,
      expected: { kind: "injected", sql: "SELECT file FROM f LIMIT 50", effective: 50 },
    },
    {
      name: "no LIMIT with trailing semicolon → strips semicolon before injection",
      sql: "SELECT file FROM f;",
      max: 50,
      expected: { kind: "injected", sql: "SELECT file FROM f LIMIT 50", effective: 50 },
    },
    {
      name: "no LIMIT with trailing whitespace → trims before injection",
      sql: "SELECT file FROM f   ",
      max: 50,
      expected: { kind: "injected", sql: "SELECT file FROM f LIMIT 50", effective: 50 },
    },
    {
      name: "LIMIT equal to max → unchanged",
      sql: "SELECT file FROM f LIMIT 50",
      max: 50,
      expected: { kind: "unchanged", sql: "SELECT file FROM f LIMIT 50", requested: 50 },
    },
    {
      name: "LIMIT below max → unchanged",
      sql: "SELECT file FROM f LIMIT 10",
      max: 50,
      expected: { kind: "unchanged", sql: "SELECT file FROM f LIMIT 10", requested: 10 },
    },
    {
      name: "LIMIT above max → shrunk to max",
      sql: "SELECT file FROM f LIMIT 1000",
      max: 50,
      expected: {
        kind: "shrunk",
        sql: "SELECT file FROM f LIMIT 50",
        requested: 1000,
        effective: 50,
      },
    },
    {
      name: "LIMIT above max with OFFSET → preserves OFFSET",
      sql: "SELECT file FROM f LIMIT 200 OFFSET 100",
      max: 50,
      expected: {
        kind: "shrunk",
        sql: "SELECT file FROM f LIMIT 50 OFFSET 100",
        requested: 200,
        effective: 50,
      },
    },
  ]

  it.each(cases)("$name", ({ sql, max, expected }) => {
    expect(capLimit(sql, max)).toEqual(expected)
  })
})

describe("hasOffset", () => {
  const cases: { name: string; sql: string; expected: boolean }[] = [
    { name: "no OFFSET", sql: "SELECT file FROM f LIMIT 10", expected: false },
    { name: "with OFFSET", sql: "SELECT file FROM f LIMIT 10 OFFSET 20", expected: true },
    { name: "OFFSET only", sql: "SELECT file FROM f OFFSET 5", expected: true },
    { name: "case insensitive", sql: "SELECT file FROM f offset 5", expected: true },
  ]

  it.each(cases)("$name", ({ sql, expected }) => {
    expect(hasOffset(sql)).toBe(expected)
  })
})

describe("dropOffset", () => {
  const cases: { name: string; sql: string; expected: string }[] = [
    {
      name: "removes OFFSET clause",
      sql: "SELECT file FROM f LIMIT 10 OFFSET 20",
      expected: "SELECT file FROM f LIMIT 10",
    },
    {
      name: "no-op when no OFFSET",
      sql: "SELECT file FROM f LIMIT 10",
      expected: "SELECT file FROM f LIMIT 10",
    },
    {
      name: "removes OFFSET at end",
      sql: "SELECT file FROM f OFFSET 5",
      expected: "SELECT file FROM f",
    },
  ]

  it.each(cases)("$name", ({ sql, expected }) => {
    expect(dropOffset(sql)).toBe(expected)
  })
})

describe("stripPaging", () => {
  const cases: { name: string; sql: string; expected: string }[] = [
    {
      name: "strips LIMIT only",
      sql: "SELECT file FROM f LIMIT 10",
      expected: "SELECT file FROM f",
    },
    {
      name: "strips OFFSET only",
      sql: "SELECT file FROM f OFFSET 5",
      expected: "SELECT file FROM f",
    },
    {
      name: "strips LIMIT and OFFSET",
      sql: "SELECT file FROM f LIMIT 10 OFFSET 20",
      expected: "SELECT file FROM f",
    },
    {
      name: "no-op on plain query",
      sql: "SELECT file FROM f",
      expected: "SELECT file FROM f",
    },
    {
      name: "preserves ORDER BY",
      sql: "SELECT file FROM f ORDER BY name LIMIT 10 OFFSET 5",
      expected: "SELECT file FROM f ORDER BY name",
    },
  ]

  it.each(cases)("$name", ({ sql, expected }) => {
    expect(stripPaging(sql)).toBe(expected)
  })
})
