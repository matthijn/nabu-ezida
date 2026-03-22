import { describe, it, expect } from "vitest"
import {
  extractSemanticTokens,
  hasSemanticTokens,
  validateSemanticSql,
  rewriteSemanticSql,
  normalizeSemanticSql,
  sanitizeSemanticError,
  countIlikeClauses,
  validateSql,
  type SemanticToken,
} from "./semantic"

describe("extractSemanticTokens", () => {
  const cases: { name: string; sql: string; expected: SemanticToken[] }[] = [
    {
      name: "no tokens in plain SQL",
      sql: "SELECT file FROM files",
      expected: [],
    },
    {
      name: "single token",
      sql: "SELECT file, SEMANTIC('populism') FROM files",
      expected: [{ text: "populism", start: 13, end: 33 }],
    },
    {
      name: "multiple tokens",
      sql: "SELECT file, SEMANTIC('anger'), SEMANTIC('joy') FROM files",
      expected: [
        { text: "anger", start: 13, end: 30 },
        { text: "joy", start: 32, end: 47 },
      ],
    },
    {
      name: "token with spaces in text",
      sql: "ORDER BY SEMANTIC('political frustration') DESC",
      expected: [{ text: "political frustration", start: 9, end: 42 }],
    },
  ]

  it.each(cases)("$name", ({ sql, expected }) => {
    expect(extractSemanticTokens(sql)).toEqual(expected)
  })
})

describe("hasSemanticTokens", () => {
  const cases: { name: string; sql: string; expected: boolean }[] = [
    { name: "plain SQL", sql: "SELECT file FROM files", expected: false },
    { name: "with SEMANTIC()", sql: "SEMANTIC('test')", expected: true },
    { name: "partial match is false", sql: "SEMANTIC test", expected: false },
  ]

  it.each(cases)("$name", ({ sql, expected }) => {
    expect(hasSemanticTokens(sql)).toBe(expected)
  })
})

describe("validateSemanticSql", () => {
  const cases: {
    name: string
    sql: string
    tokens: SemanticToken[]
    errors: string[]
  }[] = [
    {
      name: "valid: single SEMANTIC in SELECT",
      sql: "SELECT file, SEMANTIC('populism') FROM attrs",
      tokens: [{ text: "populism", start: 13, end: 33 }],
      errors: [],
    },
    {
      name: "valid: SEMANTIC with non-semantic ORDER BY",
      sql: "SELECT file, SEMANTIC('topic') FROM attrs ORDER BY name ASC",
      tokens: [{ text: "topic", start: 13, end: 30 }],
      errors: [],
    },
    {
      name: "rejects multiple SEMANTIC() calls",
      sql: "SELECT SEMANTIC('a'), SEMANTIC('b') FROM attrs",
      tokens: [
        { text: "a", start: 7, end: 20 },
        { text: "b", start: 22, end: 35 },
      ],
      errors: ["Multiple SEMANTIC()"],
    },
    {
      name: "rejects > after SEMANTIC()",
      sql: "SELECT SEMANTIC('x') > 0.5 FROM attrs",
      tokens: [{ text: "x", start: 7, end: 20 }],
      errors: ["comparison operator"],
    },
    {
      name: "rejects AS after SEMANTIC()",
      sql: "SELECT SEMANTIC('x') AS score FROM attrs",
      tokens: [{ text: "x", start: 7, end: 20 }],
      errors: ["AS alias"],
    },
    {
      name: "rejects SEMANTIC() in ORDER BY",
      sql: "SELECT file FROM attrs ORDER BY SEMANTIC('x') DESC",
      tokens: [{ text: "x", start: 32, end: 45 }],
      errors: ["ORDER BY"],
    },
    {
      name: "collects multiple errors",
      sql: "SELECT SEMANTIC('a') > 0.5, SEMANTIC('b') AS score FROM attrs ORDER BY SEMANTIC('c')",
      tokens: [
        { text: "a", start: 7, end: 20 },
        { text: "b", start: 28, end: 41 },
        { text: "c", start: 72, end: 85 },
      ],
      errors: ["Multiple SEMANTIC()", "comparison operator", "AS alias", "ORDER BY"],
    },
  ]

  it.each(cases)("$name", ({ sql, tokens, errors: expectedErrors }) => {
    const result = validateSemanticSql(sql, tokens)
    if (expectedErrors.length === 0) {
      expect(result).toEqual([])
    } else {
      expect(result).toHaveLength(expectedErrors.length)
      for (const fragment of expectedErrors) {
        expect(result.some((e) => e.includes(fragment))).toBe(true)
      }
    }
  })
})

describe("rewriteSemanticSql", () => {
  const cases: {
    name: string
    sql: string
    tokens: SemanticToken[]
    vectors: number[][]
    expected: string
  }[] = [
    {
      name: "rewrites single token with alias",
      sql: "SELECT file, SEMANTIC('populism') FROM files",
      tokens: [{ text: "populism", start: 13, end: 33 }],
      vectors: [[0.1, 0.2, 0.3]],
      expected:
        "SELECT file, list_cosine_similarity(embedding, [0.1,0.2,0.3]) AS _semantic_score FROM files",
    },
    {
      name: "preserves surrounding SQL",
      sql: "SELECT file, SEMANTIC('anger') FROM attrs WHERE x = 1",
      tokens: [{ text: "anger", start: 13, end: 30 }],
      vectors: [[0.5, 0.6]],
      expected:
        "SELECT file, list_cosine_similarity(embedding, [0.5,0.6]) AS _semantic_score FROM attrs WHERE x = 1",
    },
    {
      name: "empty tokens returns sql unchanged",
      sql: "SELECT file FROM files",
      tokens: [],
      vectors: [],
      expected: "SELECT file FROM files",
    },
  ]

  it.each(cases)("$name", ({ sql, tokens, vectors, expected }) => {
    expect(rewriteSemanticSql(sql, tokens, vectors)).toBe(expected)
  })
})

describe("countIlikeClauses", () => {
  const cases: { name: string; sql: string; expected: number }[] = [
    { name: "no ILIKE", sql: "SELECT file FROM files", expected: 0 },
    {
      name: "single ILIKE",
      sql: "SELECT file FROM files WHERE content ILIKE '%test%'",
      expected: 1,
    },
    {
      name: "three ILIKEs",
      sql: "WHERE x ILIKE '%a%' OR x ILIKE '%b%' OR x ILIKE '%c%'",
      expected: 3,
    },
    {
      name: "case insensitive counting",
      sql: "WHERE x ilike '%a%' OR x ILIKE '%b%' OR x ILike '%c%' OR x iLIKE '%d%'",
      expected: 4,
    },
    { name: "LIKE is not ILIKE", sql: "WHERE x LIKE '%a%' AND x LIKE '%b%'", expected: 0 },
  ]

  it.each(cases)("$name", ({ sql, expected }) => {
    expect(countIlikeClauses(sql)).toBe(expected)
  })
})

describe("validateSql", () => {
  const cases: {
    name: string
    sql: string
    ok: boolean
    errorContains?: string
    errorCount?: number
  }[] = [
    { name: "plain SQL passes", sql: "SELECT file FROM files", ok: true },
    {
      name: "3 ILIKEs passes",
      sql: "WHERE x ILIKE '%a%' OR x ILIKE '%b%' OR x ILIKE '%c%'",
      ok: true,
    },
    {
      name: "4 ILIKEs rejected",
      sql: "WHERE x ILIKE '%a%' OR x ILIKE '%b%' OR x ILIKE '%c%' OR x ILIKE '%d%'",
      ok: false,
      errorContains: "SEMANTIC",
    },
    {
      name: "valid SEMANTIC passes",
      sql: "SELECT file, SEMANTIC('populism') FROM attrs",
      ok: true,
    },
    {
      name: "multiple SEMANTIC rejected",
      sql: "SELECT SEMANTIC('a'), SEMANTIC('b') FROM attrs",
      ok: false,
      errorContains: "Multiple SEMANTIC()",
    },
    {
      name: "collects ILIKE and SEMANTIC errors together",
      sql: "SELECT SEMANTIC('a') AS score FROM f WHERE x ILIKE '%a%' OR x ILIKE '%b%' OR x ILIKE '%c%' OR x ILIKE '%d%'",
      ok: false,
      errorContains: "ILIKE",
      errorCount: 2,
    },
  ]

  it.each(cases)("$name", ({ sql, ok: isOk, errorContains, errorCount }) => {
    const result = validateSql(sql)
    expect(result.ok).toBe(isOk)
    if (!isOk && errorContains) {
      expect(result.ok === false && result.error).toContain(errorContains)
    }
    if (!isOk && errorCount && !result.ok) {
      expect(result.error.split("\n")).toHaveLength(errorCount)
    }
  })
})

describe("normalizeSemanticSql", () => {
  const cases: {
    name: string
    sql: string
    expected: string
  }[] = [
    {
      name: "adds ORDER BY and LIMIT when neither present",
      sql: "SELECT file FROM t",
      expected: "SELECT file FROM t ORDER BY _semantic_score DESC LIMIT 50",
    },
    {
      name: "prepends score to existing ORDER BY and adds LIMIT",
      sql: "SELECT file FROM t ORDER BY name ASC",
      expected: "SELECT file FROM t ORDER BY _semantic_score DESC, name ASC LIMIT 50",
    },
    {
      name: "inserts ORDER BY before existing LIMIT",
      sql: "SELECT file FROM t LIMIT 10",
      expected: "SELECT file FROM t ORDER BY _semantic_score DESC LIMIT 10",
    },
    {
      name: "prepends score to existing ORDER BY with existing LIMIT",
      sql: "SELECT file FROM t ORDER BY name ASC LIMIT 10",
      expected: "SELECT file FROM t ORDER BY _semantic_score DESC, name ASC LIMIT 10",
    },
    {
      name: "trims trailing whitespace",
      sql: "SELECT file FROM t   ",
      expected: "SELECT file FROM t ORDER BY _semantic_score DESC LIMIT 50",
    },
    {
      name: "preserves case of existing ORDER BY",
      sql: "SELECT file FROM t order by name",
      expected: "SELECT file FROM t order by _semantic_score DESC, name LIMIT 50",
    },
  ]

  it.each(cases)("$name", ({ sql, expected }) => {
    expect(normalizeSemanticSql(sql)).toBe(expected)
  })
})

describe("sanitizeSemanticError", () => {
  const cases: { name: string; input: string; expected: string }[] = [
    {
      name: "replaces full cosine expression with AS",
      input:
        "Query failed: Binder Error: SELECT file, list_cosine_similarity(embedding, [0.1,0.2,0.3]) AS _semantic_score FROM files",
      expected: "Query failed: Binder Error: SELECT file, SEMANTIC(...) FROM files",
    },
    {
      name: "replaces truncated cosine expression",
      input:
        "LINE 1: SELECT file, content AS text, list_cosine_similarity(embedding...\n               ^",
      expected: "LINE 1: SELECT file, content AS text, SEMANTIC(...)\n               ^",
    },
    {
      name: "replaces cosine without AS",
      input: "list_cosine_similarity(embedding, [0.1,0.2]) FROM files",
      expected: "SEMANTIC(...) FROM files",
    },
    {
      name: "passes through non-semantic errors unchanged",
      input: 'Binder Error: Referenced column "file" not found',
      expected: 'Binder Error: Referenced column "file" not found',
    },
  ]

  it.each(cases)("$name", ({ input, expected }) => {
    expect(sanitizeSemanticError(input)).toBe(expected)
  })
})
