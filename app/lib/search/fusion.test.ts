import { describe, it, expect } from "vitest"
import {
  normalizeBm25Scores,
  mergeScoreMaps,
  fuseHybridResults,
  chunkKey,
  type ScoredChunk,
} from "./fusion"

describe("chunkKey", () => {
  const cases: { name: string; chunk: ScoredChunk; expected: string }[] = [
    {
      name: "uses hash when present",
      chunk: { file: "a.md", text: "hello", hash: "abc123", score: 0.5 },
      expected: "abc123",
    },
    {
      name: "falls back to file:text",
      chunk: { file: "a.md", text: "hello", score: 0.5 },
      expected: "a.md:hello",
    },
    {
      name: "file:undefined when no text or hash",
      chunk: { file: "a.md", score: 0.5 },
      expected: "a.md:undefined",
    },
  ]

  it.each(cases)("$name", ({ chunk, expected }) => {
    expect(chunkKey(chunk)).toBe(expected)
  })
})

describe("normalizeBm25Scores", () => {
  const cases: {
    name: string
    rows: ScoredChunk[]
    expected: Map<string, number>
  }[] = [
    {
      name: "empty input returns empty map",
      rows: [],
      expected: new Map(),
    },
    {
      name: "single row normalizes to 1",
      rows: [{ file: "a.md", hash: "h1", score: -2.5 }],
      expected: new Map([["h1", 1]]),
    },
    {
      name: "range normalization negates and scales 0-1",
      rows: [
        { file: "a.md", hash: "h1", score: -5 },
        { file: "b.md", hash: "h2", score: -1 },
        { file: "c.md", hash: "h3", score: -3 },
      ],
      expected: new Map([
        ["h1", 1],
        ["h2", 0],
        ["h3", 0.5],
      ]),
    },
    {
      name: "all-equal scores normalize to 1",
      rows: [
        { file: "a.md", hash: "h1", score: -3 },
        { file: "b.md", hash: "h2", score: -3 },
      ],
      expected: new Map([
        ["h1", 1],
        ["h2", 1],
      ]),
    },
  ]

  it.each(cases)("$name", ({ rows, expected }) => {
    expect(normalizeBm25Scores(rows)).toEqual(expected)
  })
})

describe("mergeScoreMaps", () => {
  const cases: {
    name: string
    maps: Map<string, number>[]
    expected: Map<string, number>
  }[] = [
    {
      name: "single map passes through",
      maps: [new Map([["h1", 0.5]])],
      expected: new Map([["h1", 0.5]]),
    },
    {
      name: "sums values across maps",
      maps: [
        new Map([
          ["h1", 0.4],
          ["h2", 0.3],
        ]),
        new Map([
          ["h1", 0.2],
          ["h3", 0.6],
        ]),
      ],
      expected: new Map([
        ["h1", 0.6],
        ["h2", 0.3],
        ["h3", 0.6],
      ]),
    },
    {
      name: "empty input returns empty map",
      maps: [],
      expected: new Map(),
    },
    {
      name: "disjoint maps preserved independently",
      maps: [new Map([["h1", 0.8]]), new Map([["h2", 0.5]])],
      expected: new Map([
        ["h1", 0.8],
        ["h2", 0.5],
      ]),
    },
  ]

  it.each(cases)("$name", ({ maps, expected }) => {
    const result = mergeScoreMaps(maps)
    for (const [key, value] of expected) {
      expect(result.get(key)).toBeCloseTo(value, 10)
    }
    expect(result.size).toBe(expected.size)
  })
})

describe("fuseHybridResults", () => {
  const chunk = (file: string, hash: string, score: number): ScoredChunk => ({
    file,
    hash,
    text: `text-${hash}`,
    score,
  })

  const cases: {
    name: string
    input: { cosinePerAngle: ScoredChunk[][]; bm25: ScoredChunk[] }
    limit: number
    expectedFiles: string[]
  }[] = [
    {
      name: "end-to-end fusion with shared BM25",
      input: {
        cosinePerAngle: [[chunk("a.md", "h1", 0.9), chunk("b.md", "h2", 0.4)]],
        bm25: [chunk("a.md", "h1", -5), chunk("c.md", "h3", -3)],
      },
      limit: 50,
      expectedFiles: ["a.md", "b.md", "c.md"],
    },
    {
      name: "limit caps output",
      input: {
        cosinePerAngle: [
          [chunk("a.md", "h1", 0.9), chunk("b.md", "h2", 0.8), chunk("c.md", "h3", 0.7)],
        ],
        bm25: [],
      },
      limit: 2,
      expectedFiles: ["a.md", "b.md"],
    },
    {
      name: "empty cosine angles returns bm25-only results",
      input: {
        cosinePerAngle: [],
        bm25: [chunk("a.md", "h1", -2)],
      },
      limit: 50,
      expectedFiles: [],
    },
    {
      name: "multi-angle cosine with shared BM25 boosts overlapping chunks",
      input: {
        cosinePerAngle: [
          [chunk("a.md", "h1", 0.8)],
          [chunk("a.md", "h1", 0.7), chunk("b.md", "h2", 0.9)],
        ],
        bm25: [chunk("a.md", "h1", -3), chunk("b.md", "h2", -1)],
      },
      limit: 50,
      expectedFiles: ["a.md", "b.md"],
    },
  ]

  it.each(cases)("$name", ({ input, limit, expectedFiles }) => {
    const result = fuseHybridResults(input, limit)
    expect(result.map((r) => r.file)).toEqual(expectedFiles)
    expect(result.length).toBeLessThanOrEqual(limit)
  })
})
