import { describe, it, expect } from "vitest"
import {
  rrfScores,
  toRankMap,
  fuseCosineResults,
  chunkKey,
  RRF_K,
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

describe("toRankMap", () => {
  const cases: {
    name: string
    rows: ScoredChunk[]
    expected: [string, number][]
  }[] = [
    {
      name: "assigns 1-based ranks in order",
      rows: [
        { file: "a.md", hash: "h1", score: 0.9 },
        { file: "b.md", hash: "h2", score: 0.7 },
      ],
      expected: [
        ["h1", 1],
        ["h2", 2],
      ],
    },
    {
      name: "keeps first occurrence for duplicates",
      rows: [
        { file: "a.md", hash: "h1", score: 0.9 },
        { file: "a.md", hash: "h1", score: 0.5 },
      ],
      expected: [["h1", 1]],
    },
    {
      name: "empty input returns empty map",
      rows: [],
      expected: [],
    },
  ]

  it.each(cases)("$name", ({ rows, expected }) => {
    const result = toRankMap(rows)
    expect([...result.entries()].sort()).toEqual([...expected].sort())
  })
})

describe("rrfScores", () => {
  const cases: {
    name: string
    rankMaps: Map<string, number>[]
    expected: [string, number][]
  }[] = [
    {
      name: "single ranker",
      rankMaps: [
        new Map([
          ["h1", 1],
          ["h2", 2],
        ]),
      ],
      expected: [
        ["h1", 1 / (RRF_K + 1)],
        ["h2", 1 / (RRF_K + 2)],
      ],
    },
    {
      name: "two rankers sum contributions",
      rankMaps: [
        new Map([["h1", 1]]),
        new Map([
          ["h1", 3],
          ["h2", 1],
        ]),
      ],
      expected: [
        ["h1", 1 / (RRF_K + 1) + 1 / (RRF_K + 3)],
        ["h2", 1 / (RRF_K + 1)],
      ],
    },
    {
      name: "disjoint rankers",
      rankMaps: [new Map([["h1", 1]]), new Map([["h2", 1]])],
      expected: [
        ["h1", 1 / (RRF_K + 1)],
        ["h2", 1 / (RRF_K + 1)],
      ],
    },
    {
      name: "empty input returns empty",
      rankMaps: [],
      expected: [],
    },
  ]

  it.each(cases)("$name", ({ rankMaps, expected }) => {
    const result = rrfScores(rankMaps)
    expect(result.size).toBe(expected.length)
    for (const [key, value] of expected) {
      expect(result.get(key)).toBeCloseTo(value, 10)
    }
  })
})

describe("fuseCosineResults", () => {
  const chunk = (file: string, hash: string, score: number): ScoredChunk => ({
    file,
    hash,
    text: `text-${hash}`,
    score,
  })

  const cases: {
    name: string
    cosinePerHyde: ScoredChunk[][]
    limit: number
    expectedFiles: string[]
  }[] = [
    {
      name: "single hyde group sorted by rank",
      cosinePerHyde: [[chunk("a.md", "h1", 0.9), chunk("b.md", "h2", 0.4)]],
      limit: 50,
      expectedFiles: ["a.md", "b.md"],
    },
    {
      name: "limit caps output",
      cosinePerHyde: [
        [chunk("a.md", "h1", 0.9), chunk("b.md", "h2", 0.8), chunk("c.md", "h3", 0.7)],
      ],
      limit: 2,
      expectedFiles: ["a.md", "b.md"],
    },
    {
      name: "empty input returns empty",
      cosinePerHyde: [],
      limit: 50,
      expectedFiles: [],
    },
    {
      name: "disjoint hydes contribute independently via RRF",
      cosinePerHyde: [
        [chunk("a.md", "h1", 0.9), chunk("b.md", "h2", 0.8)],
        [chunk("c.md", "h3", 0.7), chunk("a.md", "h1", 0.6)],
      ],
      limit: 50,
      expectedFiles: ["a.md", "c.md", "b.md"],
    },
    {
      name: "low-score chunks still included (no cosine threshold)",
      cosinePerHyde: [[chunk("a.md", "h1", 0.9), chunk("b.md", "h2", 0.1)]],
      limit: 50,
      expectedFiles: ["a.md", "b.md"],
    },
    {
      name: "multi-hyde overlapping chunks accumulate RRF",
      cosinePerHyde: [
        [chunk("a.md", "h1", 0.8), chunk("b.md", "h2", 0.7)],
        [chunk("b.md", "h2", 0.9), chunk("a.md", "h1", 0.6)],
      ],
      limit: 50,
      expectedFiles: ["a.md", "b.md"],
    },
  ]

  it.each(cases)("$name", ({ cosinePerHyde, limit, expectedFiles }) => {
    const result = fuseCosineResults(cosinePerHyde, limit)
    expect(result.map((r) => r.file)).toEqual(expectedFiles)
    expect(result.length).toBeLessThanOrEqual(limit)
  })
})
