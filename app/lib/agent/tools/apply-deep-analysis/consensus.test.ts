import { describe, it, expect } from "vitest"
import {
  tallyVotes,
  classifyTier,
  expandAnchors,
  groupConsecutiveSpans,
  promoteSpans,
  median,
  selectOutlier,
  dropOutlier,
  type FindResult,
  type Tier,
} from "./consensus"

describe("classifyTier", () => {
  const cases = [
    { name: "4/4 → anchor", votes: 4, n: 4, expected: "anchor" },
    { name: "3/4 → anchor", votes: 3, n: 4, expected: "anchor" },
    { name: "2/4 → promotable", votes: 2, n: 4, expected: "promotable" },
    { name: "1/4 → noise", votes: 1, n: 4, expected: "noise" },
    { name: "0/4 → noise", votes: 0, n: 4, expected: "noise" },
    {
      name: "2/3 → anchor (ceil 0.75*3=3? no, ceil(2.25)=3 → promotable)",
      votes: 2,
      n: 3,
      expected: "promotable",
    },
    { name: "3/3 → anchor", votes: 3, n: 3, expected: "anchor" },
  ]

  cases.forEach(({ name, votes, n, expected }) => {
    it(name, () => expect(classifyTier(votes, n)).toBe(expected))
  })
})

describe("tallyVotes", () => {
  it("counts per (sentence, code) pair across runs", () => {
    const runs: FindResult[][] = [
      [{ start: 1, end: 3, analysis_source_id: "X" }],
      [{ start: 2, end: 4, analysis_source_id: "X" }],
      [{ start: 1, end: 2, analysis_source_id: "X" }],
    ]
    const tally = tallyVotes(runs, 5)
    const x = tally.get("X") as Map<number, number>
    expect(x.get(1)).toBe(2)
    expect(x.get(2)).toBe(3)
    expect(x.get(3)).toBe(2)
    expect(x.get(4)).toBe(1)
    expect(x.has(5)).toBe(false)
  })

  it("handles multiple codes", () => {
    const runs: FindResult[][] = [
      [
        { start: 1, end: 1, analysis_source_id: "A" },
        { start: 2, end: 2, analysis_source_id: "B" },
      ],
    ]
    const tally = tallyVotes(runs, 3)
    expect((tally.get("A") as Map<number, number>).get(1)).toBe(1)
    expect((tally.get("B") as Map<number, number>).get(2)).toBe(1)
  })

  it("deduplicates overlapping spans within a single run", () => {
    const runs: FindResult[][] = [
      [
        { start: 1, end: 4, analysis_source_id: "X" },
        { start: 3, end: 6, analysis_source_id: "X" },
      ],
    ]
    const tally = tallyVotes(runs, 6)
    const x = tally.get("X") as Map<number, number>
    for (let s = 1; s <= 6; s++) {
      expect(x.get(s)).toBe(1)
    }
  })

  it("deduplicates same code but not across codes", () => {
    const runs: FindResult[][] = [
      [
        { start: 1, end: 3, analysis_source_id: "A" },
        { start: 2, end: 4, analysis_source_id: "A" },
        { start: 2, end: 4, analysis_source_id: "B" },
      ],
    ]
    const tally = tallyVotes(runs, 4)
    const a = tally.get("A") as Map<number, number>
    const b = tally.get("B") as Map<number, number>
    expect(a.get(2)).toBe(1)
    expect(a.get(3)).toBe(1)
    expect(b.get(2)).toBe(1)
    expect(b.get(3)).toBe(1)
  })

  it("clamps to sentenceCount", () => {
    const runs: FindResult[][] = [[{ start: 1, end: 10, analysis_source_id: "X" }]]
    const tally = tallyVotes(runs, 3)
    expect((tally.get("X") as Map<number, number>).has(4)).toBe(false)
  })
})

describe("expandAnchors", () => {
  it("promotes adjacent promotable from anchor", () => {
    const cls = new Map<number, "anchor" | "promotable" | "noise">([
      [1, "promotable"],
      [2, "anchor"],
      [3, "promotable"],
    ])
    const result = expandAnchors(cls, 3)
    expect(result.get(1)).toBe("certain")
    expect(result.get(2)).toBe("certain")
    expect(result.get(3)).toBe("certain")
  })

  it("stops at noise gap", () => {
    const cls = new Map<number, "anchor" | "promotable" | "noise">([
      [1, "anchor"],
      [2, "noise"],
      [3, "promotable"],
    ])
    const result = expandAnchors(cls, 3)
    expect(result.get(1)).toBe("certain")
    expect(result.has(2)).toBe(false)
    expect(result.get(3)).toBe("uncertain")
  })

  it("unreached promotable becomes uncertain", () => {
    const cls = new Map<number, "anchor" | "promotable" | "noise">([
      [1, "promotable"],
      [3, "anchor"],
    ])
    const result = expandAnchors(cls, 3)
    expect(result.get(1)).toBe("uncertain")
    expect(result.get(3)).toBe("certain")
  })
})

describe("groupConsecutiveSpans", () => {
  it("groups consecutive sentences into spans", () => {
    const tiers = new Map<number, Tier>([
      [1, "certain"],
      [2, "certain"],
      [4, "certain"],
    ])
    const spans = groupConsecutiveSpans(tiers, "X", "certain")
    expect(spans).toEqual([
      { start: 1, end: 2, analysis_source_id: "X", tier: "certain" },
      { start: 4, end: 4, analysis_source_id: "X", tier: "certain" },
    ])
  })

  it("returns empty for no matching tier", () => {
    const tiers = new Map<number, Tier>([[1, "certain"]])
    expect(groupConsecutiveSpans(tiers, "X", "uncertain")).toEqual([])
  })
})

describe("promoteSpans", () => {
  const makeRuns = (votesPerSentence: number[], n: number, code = "X"): FindResult[][] => {
    const runs: FindResult[][] = Array.from({ length: n }, () => [])
    for (let s = 0; s < votesPerSentence.length; s++) {
      const v = votesPerSentence[s]
      for (let r = 0; r < v; r++) {
        runs[r].push({ start: s + 1, end: s + 1, analysis_source_id: code })
      }
    }
    return runs
  }

  const cases: {
    name: string
    votes: number[]
    n: number
    expectedCertain: [number, number][]
    expectedUncertain: [number, number][]
  }[] = [
    {
      name: "a:3,b:2,c:2,d:2 → all certain",
      votes: [3, 2, 2, 2],
      n: 4,
      expectedCertain: [[1, 4]],
      expectedUncertain: [],
    },
    {
      name: "a:3,b:2,c:1,d:2,e:3 → (a,b) certain, (d,e) certain",
      votes: [3, 2, 1, 2, 3],
      n: 4,
      expectedCertain: [
        [1, 2],
        [4, 5],
      ],
      expectedUncertain: [],
    },
    {
      name: "a:3,b:2,c:2,d:1,e:2 → (a,b,c) certain, (e) uncertain",
      votes: [3, 2, 2, 1, 2],
      n: 4,
      expectedCertain: [[1, 3]],
      expectedUncertain: [[5, 5]],
    },
    {
      name: "a:3,b:2,c:0,d:2 → (a,b) certain, (d) uncertain",
      votes: [3, 2, 0, 2],
      n: 4,
      expectedCertain: [[1, 2]],
      expectedUncertain: [[4, 4]],
    },
    {
      name: "a:2,b:2,c:2 → all uncertain",
      votes: [2, 2, 2],
      n: 4,
      expectedCertain: [],
      expectedUncertain: [[1, 3]],
    },
    {
      name: "a:3,b:3,c:2,d:2 → all certain",
      votes: [3, 3, 2, 2],
      n: 4,
      expectedCertain: [[1, 4]],
      expectedUncertain: [],
    },
    {
      name: "a:4,b:0,c:2 → (a) certain, (c) uncertain",
      votes: [4, 0, 2],
      n: 4,
      expectedCertain: [[1, 1]],
      expectedUncertain: [[3, 3]],
    },
  ]

  cases.forEach(({ name, votes, n, expectedCertain, expectedUncertain }) => {
    it(name, () => {
      const runs = makeRuns(votes, n)
      const result = promoteSpans(runs, votes.length, n)
      const toRanges = (spans: { start: number; end: number }[]): [number, number][] =>
        spans.map((s) => [s.start, s.end])
      expect(toRanges(result.certain)).toEqual(expectedCertain)
      expect(toRanges(result.uncertain)).toEqual(expectedUncertain)
    })
  })

  it("handles zero runs", () => {
    const result = promoteSpans([], 5, 4)
    expect(result.certain).toEqual([])
    expect(result.uncertain).toEqual([])
  })

  it("handles multiple codes", () => {
    const runs: FindResult[][] = [
      [
        { start: 1, end: 2, analysis_source_id: "A" },
        { start: 1, end: 1, analysis_source_id: "B" },
      ],
      [
        { start: 1, end: 2, analysis_source_id: "A" },
        { start: 1, end: 1, analysis_source_id: "B" },
      ],
      [
        { start: 1, end: 2, analysis_source_id: "A" },
        { start: 1, end: 1, analysis_source_id: "B" },
      ],
      [{ start: 1, end: 1, analysis_source_id: "A" }],
    ]
    const result = promoteSpans(runs, 2, 4)
    const aCertain = result.certain.filter((s) => s.analysis_source_id === "A")
    const bCertain = result.certain.filter((s) => s.analysis_source_id === "B")
    expect(aCertain).toEqual([{ start: 1, end: 2, analysis_source_id: "A", tier: "certain" }])
    expect(bCertain).toEqual([{ start: 1, end: 1, analysis_source_id: "B", tier: "certain" }])
  })
})

describe("median", () => {
  const cases = [
    { name: "odd count", values: [3, 1, 2], expected: 2 },
    { name: "even count", values: [1, 3, 2, 4], expected: 2.5 },
    { name: "single", values: [5], expected: 5 },
    { name: "two equal", values: [3, 3], expected: 3 },
    { name: "already sorted", values: [1, 2, 3, 4, 5], expected: 3 },
  ]

  cases.forEach(({ name, values, expected }) => {
    it(name, () => expect(median(values)).toBe(expected))
  })
})

describe("selectOutlier", () => {
  const s = (start: number, end: number, code = "X"): FindResult => ({
    start,
    end,
    analysis_source_id: code,
  })

  const cases: {
    name: string
    runs: FindResult[][]
    expected: number
  }[] = [
    {
      name: "drops the run with most distant span count",
      runs: [
        [s(1, 2), s(3, 4)],
        [s(1, 2), s(3, 4)],
        [s(1, 2), s(3, 4)],
        [s(1, 2), s(3, 4)],
        [s(1, 2), s(3, 4), s(5, 6), s(7, 8), s(9, 10)],
      ],
      expected: 4,
    },
    {
      name: "drops low outlier",
      runs: [[s(1, 3)], [s(1, 3), s(4, 5)], [s(1, 3), s(4, 5)], [s(1, 3), s(4, 5)], []],
      expected: 4,
    },
    {
      name: "tie-breaks by orphan count — run 4 has 2 orphans vs 1",
      runs: [
        [s(1, 2), s(3, 4), s(5, 6)],
        [s(1, 2), s(3, 4), s(5, 6)],
        [s(1, 2), s(3, 4), s(5, 6)],
        [s(1, 2), s(3, 4), s(99, 100)],
        [s(1, 2), s(50, 60), s(70, 80)],
      ],
      expected: 4,
    },
    {
      name: "tie-break: more orphans loses",
      runs: [
        [s(1, 1), s(2, 2), s(3, 3)],
        [s(1, 1), s(2, 2), s(3, 3)],
        [s(1, 1), s(2, 2), s(3, 3)],
        [s(1, 1), s(90, 90), s(91, 91)],
        [s(1, 1), s(2, 2), s(80, 80)],
      ],
      expected: 3,
    },
  ]

  cases.forEach(({ name, runs, expected }) => {
    it(name, () => expect(selectOutlier(runs)).toBe(expected))
  })
})

describe("dropOutlier", () => {
  it("returns 4 runs from 5", () => {
    const runs: FindResult[][] = [[], [], [], [], [{ start: 1, end: 10, analysis_source_id: "X" }]]
    const result = dropOutlier(runs)
    expect(result).toHaveLength(4)
    expect(result.every((r) => r.length === 0)).toBe(true)
  })

  it("returns single run unchanged", () => {
    const runs: FindResult[][] = [[{ start: 1, end: 1, analysis_source_id: "X" }]]
    expect(dropOutlier(runs)).toEqual(runs)
  })

  it("returns empty unchanged", () => {
    expect(dropOutlier([])).toEqual([])
  })
})
