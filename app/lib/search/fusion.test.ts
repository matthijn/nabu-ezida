import { describe, it, expect } from "vitest"
import { mergeScoreMaps, fuseCosineResults, chunkKey, type ScoredChunk } from "./fusion"

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
      name: "single hyde group sorted by score",
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
      name: "multi-hyde overlapping chunks accumulate scores",
      cosinePerHyde: [
        [chunk("a.md", "h1", 0.8)],
        [chunk("a.md", "h1", 0.7), chunk("b.md", "h2", 0.9)],
      ],
      limit: 50,
      expectedFiles: ["a.md", "b.md"],
    },
    {
      name: "multi-hyde disjoint chunks merged and ranked",
      cosinePerHyde: [
        [chunk("a.md", "h1", 0.3)],
        [chunk("b.md", "h2", 0.5)],
        [chunk("c.md", "h3", 0.4)],
      ],
      limit: 50,
      expectedFiles: ["b.md", "c.md", "a.md"],
    },
  ]

  it.each(cases)("$name", ({ cosinePerHyde, limit, expectedFiles }) => {
    const result = fuseCosineResults(cosinePerHyde, limit)
    expect(result.map((r) => r.file)).toEqual(expectedFiles)
    expect(result.length).toBeLessThanOrEqual(limit)
  })
})
