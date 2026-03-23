import { describe, it, expect } from "vitest"
import {
  extractSemanticTokens,
  hasSemanticTokens,
  validateSemanticSql,
  normalizeSemanticSql,
  sanitizeSemanticError,
  formatDebugSql,
  countIlikeClauses,
  validateSql,
  stripSemanticToken,
  extractLimit,
  buildCosineQuery,
  buildBm25Query,
  buildHybridPlan,
  uniqueWords,
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
      name: "token with spaces in text",
      sql: "SELECT SEMANTIC('political frustration') FROM files",
      expected: [{ text: "political frustration", start: 7, end: 40 }],
    },
    {
      name: "does not match multi-arg syntax",
      sql: "SELECT SEMANTIC('a', 'b') FROM files",
      expected: [],
    },
  ]

  it.each(cases)("$name", ({ sql, expected }) => {
    expect(extractSemanticTokens(sql)).toEqual(expected)
  })
})

describe("hasSemanticTokens", () => {
  const cases: { name: string; sql: string; expected: boolean }[] = [
    { name: "plain SQL", sql: "SELECT file FROM files", expected: false },
    { name: "SEMANTIC()", sql: "SEMANTIC('test')", expected: true },
    { name: "multi-arg is not matched", sql: "SEMANTIC('a', 'b')", expected: false },
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
      name: "multiple SEMANTIC calls rejected",
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
      expected: "SELECT file FROM t ORDER BY _semantic_score DESC LIMIT 10",
    },
    {
      name: "prepends score to existing ORDER BY and adds LIMIT",
      sql: "SELECT file FROM t ORDER BY name ASC",
      expected: "SELECT file FROM t ORDER BY _semantic_score DESC, name ASC LIMIT 10",
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
      expected: "SELECT file FROM t ORDER BY _semantic_score DESC LIMIT 10",
    },
    {
      name: "preserves case of existing ORDER BY",
      sql: "SELECT file FROM t order by name",
      expected: "SELECT file FROM t order by _semantic_score DESC, name LIMIT 10",
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

describe("formatDebugSql", () => {
  const cases: { name: string; sql: string; expected: string }[] = [
    {
      name: "semantic gets alias, order, and limit",
      sql: "SELECT f.file, f.text, SEMANTIC('political frustration') FROM files f",
      expected:
        "SELECT f.file, f.text, SEMANTIC('political frustration') AS _semantic_score FROM files f ORDER BY _semantic_score DESC LIMIT 10",
    },
    {
      name: "non-semantic query passes through unchanged",
      sql: "SELECT DISTINCT a.file FROM attributes a WHERE list_has(a.tags, 'interview')",
      expected: "SELECT DISTINCT a.file FROM attributes a WHERE list_has(a.tags, 'interview')",
    },
    {
      name: "semantic with existing ORDER BY prepends score",
      sql: "SELECT f.file, f.text, SEMANTIC('anxiety') FROM files f ORDER BY f.file",
      expected:
        "SELECT f.file, f.text, SEMANTIC('anxiety') AS _semantic_score FROM files f ORDER BY _semantic_score DESC, f.file LIMIT 10",
    },
    {
      name: "semantic with existing LIMIT preserves it",
      sql: "SELECT f.file, f.text, SEMANTIC('joy') FROM files f LIMIT 10",
      expected:
        "SELECT f.file, f.text, SEMANTIC('joy') AS _semantic_score FROM files f ORDER BY _semantic_score DESC LIMIT 10",
    },
  ]

  it.each(cases)("$name", ({ sql, expected }) => {
    expect(formatDebugSql(sql)).toBe(expected)
  })
})

describe("stripSemanticToken", () => {
  const cases: { name: string; sql: string; token: SemanticToken; expected: string }[] = [
    {
      name: "removes SEMANTIC from middle of SELECT list",
      sql: "SELECT f.file, f.text, SEMANTIC('anger') FROM files f",
      token: { text: "anger", start: 23, end: 40 },
      expected: "SELECT f.file, f.text FROM files f",
    },
    {
      name: "removes SEMANTIC between other columns",
      sql: "SELECT f.file, SEMANTIC('topic'), f.text FROM files f",
      token: { text: "topic", start: 15, end: 32 },
      expected: "SELECT f.file, f.text FROM files f",
    },
  ]

  it.each(cases)("$name", ({ sql, token, expected }) => {
    expect(stripSemanticToken(sql, token)).toBe(expected)
  })
})

describe("extractLimit", () => {
  const cases: { name: string; sql: string; expected: number }[] = [
    { name: "explicit LIMIT", sql: "SELECT file FROM f LIMIT 25", expected: 25 },
    { name: "no LIMIT defaults to 10", sql: "SELECT file FROM f", expected: 10 },
    {
      name: "LIMIT at end of complex query",
      sql: "SELECT file FROM f WHERE x = 1 ORDER BY file LIMIT 100",
      expected: 100,
    },
  ]

  it.each(cases)("$name", ({ sql, expected }) => {
    expect(extractLimit(sql)).toBe(expected)
  })
})

describe("buildCosineQuery", () => {
  const cases: {
    name: string
    baseSql: string
    angle: { text: string; cosineVector: number[] }
    expectedContains: string[]
  }[] = [
    {
      name: "injects cosine similarity and orders by score",
      baseSql: "SELECT f.file, f.text FROM files f",
      angle: { text: "anger", cosineVector: [0.1, 0.2, 0.3] },
      expectedContains: [
        "list_cosine_similarity(embedding, [0.1,0.2,0.3])",
        "AS _semantic_score",
        "ORDER BY _semantic_score DESC",
        "LIMIT 200",
      ],
    },
    {
      name: "strips existing ORDER BY and LIMIT from base",
      baseSql: "SELECT f.file, f.text FROM files f ORDER BY f.file LIMIT 10",
      angle: { text: "anger", cosineVector: [0.5] },
      expectedContains: [
        "list_cosine_similarity(embedding, [0.5])",
        "ORDER BY _semantic_score DESC LIMIT 200",
      ],
    },
    {
      name: "injects column into SELECT before FROM when WHERE clause present",
      baseSql:
        "SELECT f.file, f.text FROM files f WHERE f.file IN (SELECT a.file FROM attributes a WHERE list_has(a.tags, 'interview'))",
      angle: { text: "anger", cosineVector: [0.1] },
      expectedContains: [
        "SELECT f.file, f.text, list_cosine_similarity(embedding, [0.1]) AS _semantic_score FROM files f WHERE",
      ],
    },
  ]

  it.each(cases)("$name", ({ baseSql, angle, expectedContains }) => {
    const result = buildCosineQuery(baseSql, angle)
    for (const fragment of expectedContains) {
      expect(result).toContain(fragment)
    }
  })
})

describe("buildBm25Query", () => {
  const cases: {
    name: string
    baseSql: string
    searchTerms: string
    expectedContains: string[]
  }[] = [
    {
      name: "injects BM25 match and orders by score",
      baseSql: "SELECT f.file, f.text FROM files f",
      searchTerms: "anger",
      expectedContains: [
        "fts_main_files.match_bm25(hash, 'anger')",
        "AS _bm25_score",
        "ORDER BY _bm25_score DESC",
        "LIMIT 200",
      ],
    },
    {
      name: "injects BM25 column before FROM when WHERE clause present",
      baseSql:
        "SELECT f.file, f.text FROM files f WHERE f.file IN (SELECT a.file FROM attributes a)",
      searchTerms: "isolation loneliness",
      expectedContains: [
        "SELECT f.file, f.text, fts_main_files.match_bm25(hash, 'isolation loneliness') AS _bm25_score FROM files f WHERE",
      ],
    },
  ]

  it.each(cases)("$name", ({ baseSql, searchTerms, expectedContains }) => {
    const result = buildBm25Query(baseSql, searchTerms)
    for (const fragment of expectedContains) {
      expect(result).toContain(fragment)
    }
  })
})

describe("uniqueWords", () => {
  const cases: { name: string; texts: string[]; expected: string }[] = [
    {
      name: "single text",
      texts: ["anger fear"],
      expected: "anger fear",
    },
    {
      name: "deduplicates across texts",
      texts: ["home sweet home", "home alone"],
      expected: "home sweet alone",
    },
    {
      name: "lowercases all words",
      texts: ["Anger", "FEAR", "anger"],
      expected: "anger fear",
    },
    {
      name: "empty input",
      texts: [],
      expected: "",
    },
    {
      name: "preserves order of first occurrence",
      texts: ["political frustration", "economic frustration"],
      expected: "political frustration economic",
    },
  ]

  it.each(cases)("$name", ({ texts, expected }) => {
    expect(uniqueWords(texts)).toBe(expected)
  })
})

describe("buildHybridPlan", () => {
  it("builds plan from SQL, token, and angles", () => {
    const sql = "SELECT f.file, f.text, SEMANTIC('emotional distress') FROM files f LIMIT 30"
    const token: SemanticToken = { text: "emotional distress", start: 23, end: 52 }
    const angles = [
      { text: "feelings of anxiety", cosineVector: [0.1, 0.2] },
      { text: "signs of depression", cosineVector: [0.3, 0.4] },
    ]

    const plan = buildHybridPlan(sql, token, angles)

    expect(plan.intent).toBe("emotional distress")
    expect(plan.limit).toBe(30)
    expect(plan.angles).toHaveLength(2)
    expect(plan.angles[0]).toEqual({ text: "feelings of anxiety", cosineVector: [0.1, 0.2] })
    expect(plan.angles[1]).toEqual({ text: "signs of depression", cosineVector: [0.3, 0.4] })
    expect(plan.baseSql).not.toContain("SEMANTIC")
    expect(plan.baseSql).toContain("f.file")
  })
})
