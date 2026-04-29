import { describe, it, expect } from "vitest"
import { tallyVotes, groupConsecutive, groupBySpan, consensus, type FindResult } from "./consensus"

const r = (start: number, end: number, analysis_source_id: string): FindResult => ({
  start,
  end,
  analysis_source_id,
  reason: "",
})

describe("tallyVotes", () => {
  it("counts per (sentence, code) pair across runs", () => {
    const runs: FindResult[][] = [[r(1, 3, "X")], [r(2, 4, "X")], [r(1, 2, "X")]]
    const tally = tallyVotes(runs, 5)
    const x = tally.get("X") as Map<number, number>
    expect(x.get(1)).toBe(2)
    expect(x.get(2)).toBe(3)
    expect(x.get(3)).toBe(2)
    expect(x.get(4)).toBe(1)
    expect(x.has(5)).toBe(false)
  })

  it("handles multiple codes", () => {
    const runs: FindResult[][] = [[r(1, 1, "A"), r(2, 2, "B")]]
    const tally = tallyVotes(runs, 3)
    expect((tally.get("A") as Map<number, number>).get(1)).toBe(1)
    expect((tally.get("B") as Map<number, number>).get(2)).toBe(1)
  })

  it("deduplicates overlapping spans within a single run", () => {
    const runs: FindResult[][] = [[r(1, 4, "X"), r(3, 6, "X")]]
    const tally = tallyVotes(runs, 6)
    const x = tally.get("X") as Map<number, number>
    for (let s = 1; s <= 6; s++) {
      expect(x.get(s)).toBe(1)
    }
  })

  it("deduplicates same code but not across codes", () => {
    const runs: FindResult[][] = [[r(1, 3, "A"), r(2, 4, "A"), r(2, 4, "B")]]
    const tally = tallyVotes(runs, 4)
    const a = tally.get("A") as Map<number, number>
    const b = tally.get("B") as Map<number, number>
    expect(a.get(2)).toBe(1)
    expect(a.get(3)).toBe(1)
    expect(b.get(2)).toBe(1)
    expect(b.get(3)).toBe(1)
  })

  it("clamps to sentenceCount", () => {
    const runs: FindResult[][] = [[r(1, 10, "X")]]
    const tally = tallyVotes(runs, 3)
    expect((tally.get("X") as Map<number, number>).has(4)).toBe(false)
  })
})

describe("groupConsecutive", () => {
  const cases: {
    name: string
    sentences: number[]
    code: string
    expected: FindResult[]
  }[] = [
    {
      name: "empty input → empty result",
      sentences: [],
      code: "X",
      expected: [],
    },
    {
      name: "single sentence → single span",
      sentences: [3],
      code: "X",
      expected: [r(3, 3, "X")],
    },
    {
      name: "consecutive sentences → one span",
      sentences: [1, 2, 3],
      code: "A",
      expected: [r(1, 3, "A")],
    },
    {
      name: "gap produces two spans",
      sentences: [1, 2, 5, 6],
      code: "B",
      expected: [r(1, 2, "B"), r(5, 6, "B")],
    },
    {
      name: "unsorted input is sorted before grouping",
      sentences: [5, 3, 4, 1],
      code: "C",
      expected: [r(1, 1, "C"), r(3, 5, "C")],
    },
    {
      name: "multiple gaps produce multiple spans",
      sentences: [1, 3, 5],
      code: "D",
      expected: [r(1, 1, "D"), r(3, 3, "D"), r(5, 5, "D")],
    },
  ]

  cases.forEach(({ name, sentences, code, expected }) => {
    it(name, () => expect(groupConsecutive(sentences, code)).toEqual(expected))
  })
})

describe("consensus", () => {
  const cases: {
    name: string
    runs: FindResult[][]
    sentenceCount: number
    threshold: number
    expected: FindResult[]
  }[] = [
    {
      name: "all runs agree → all sentences pass",
      runs: [[r(1, 3, "X")], [r(1, 3, "X")], [r(1, 3, "X")]],
      sentenceCount: 3,
      threshold: 3,
      expected: [r(1, 3, "X")],
    },
    {
      name: "below threshold → no spans",
      runs: [[r(1, 2, "X")], [], []],
      sentenceCount: 2,
      threshold: 2,
      expected: [],
    },
    {
      name: "partial overlap filters to threshold-passing sentences",
      runs: [[r(1, 3, "X")], [r(2, 4, "X")], [r(2, 3, "X")]],
      sentenceCount: 5,
      threshold: 3,
      expected: [r(2, 3, "X")],
    },
    {
      name: "multiple codes tallied separately",
      runs: [
        [r(1, 1, "A"), r(2, 2, "B")],
        [r(1, 1, "A"), r(2, 2, "B")],
      ],
      sentenceCount: 3,
      threshold: 2,
      expected: [r(1, 1, "A"), r(2, 2, "B")],
    },
    {
      name: "empty runs → empty result",
      runs: [],
      sentenceCount: 5,
      threshold: 3,
      expected: [],
    },
    {
      name: "gap in consensus produces separate spans",
      runs: [[r(1, 4, "X")], [r(1, 2, "X")], [r(1, 2, "X"), r(4, 4, "X")]],
      sentenceCount: 4,
      threshold: 3,
      expected: [r(1, 2, "X")],
    },
    {
      name: "threshold 1 passes everything",
      runs: [[r(1, 5, "X")]],
      sentenceCount: 5,
      threshold: 1,
      expected: [r(1, 5, "X")],
    },
  ]

  cases.forEach(({ name, runs, sentenceCount, threshold, expected }) => {
    it(name, () => expect(consensus(runs, sentenceCount, threshold)).toEqual(expected))
  })
})

describe("groupBySpan", () => {
  const cases = [
    {
      name: "empty input → empty result",
      spans: [],
      expected: [],
    },
    {
      name: "single span stays as-is",
      spans: [r(1, 3, "X")],
      expected: [{ start: 1, end: 3, codings: ["X"] }],
    },
    {
      name: "same bounds different codes → merged",
      spans: [r(1, 3, "A"), r(1, 3, "B")],
      expected: [{ start: 1, end: 3, codings: ["A", "B"] }],
    },
    {
      name: "different bounds → separate entries",
      spans: [r(1, 2, "A"), r(3, 4, "A")],
      expected: [
        { start: 1, end: 2, codings: ["A"] },
        { start: 3, end: 4, codings: ["A"] },
      ],
    },
    {
      name: "duplicate code on same span → deduplicated",
      spans: [r(1, 3, "X"), r(1, 3, "X")],
      expected: [{ start: 1, end: 3, codings: ["X"] }],
    },
    {
      name: "mixed: some merge, some separate",
      spans: [r(1, 3, "A"), r(1, 3, "B"), r(5, 7, "A")],
      expected: [
        { start: 1, end: 3, codings: ["A", "B"] },
        { start: 5, end: 7, codings: ["A"] },
      ],
    },
  ]

  cases.forEach(({ name, spans, expected }) => {
    it(name, () => expect(groupBySpan(spans)).toEqual(expected))
  })
})
