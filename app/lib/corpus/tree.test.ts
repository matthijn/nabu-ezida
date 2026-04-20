import { describe, it, expect } from "vitest"
import { isExcludedLabel, filterExcludedLabels, selectSignificantCorpora } from "./tree"

describe("isExcludedLabel", () => {
  const cases: { name: string; label: string; expected: boolean }[] = [
    { name: "unknown is excluded", label: "unknown", expected: true },
    { name: "undefined is excluded", label: "undefined", expected: true },
    { name: "Unknown is excluded (case-insensitive)", label: "Unknown", expected: true },
    { name: "UNDEFINED is excluded (case-insensitive)", label: "UNDEFINED", expected: true },
    { name: "normal label is not excluded", label: "report", expected: false },
  ]

  it.each(cases)("$name", ({ label, expected }) => {
    expect(isExcludedLabel(label)).toBe(expected)
  })
})

describe("filterExcludedLabels", () => {
  const cases: { name: string; labels: string[]; expected: string[] }[] = [
    {
      name: "removes unknown and undefined",
      labels: ["report", "unknown", "memo", "undefined"],
      expected: ["report", "memo"],
    },
    {
      name: "preserves all valid labels",
      labels: ["report", "memo", "article"],
      expected: ["report", "memo", "article"],
    },
    {
      name: "empty input returns empty",
      labels: [],
      expected: [],
    },
  ]

  it.each(cases)("$name", ({ labels, expected }) => {
    expect(filterExcludedLabels(labels)).toEqual(expected)
  })
})

describe("selectSignificantCorpora", () => {
  const cases: {
    name: string
    corpora: { corpus: string; count: number }[]
    threshold?: number
    expected: string[]
  }[] = [
    {
      name: "empty input returns empty",
      corpora: [],
      expected: [],
    },
    {
      name: "includes corpora above 5% of total",
      corpora: [
        { corpus: "a:a", count: 60 },
        { corpus: "b:b", count: 30 },
        { corpus: "c:c", count: 8 },
        { corpus: "d:d", count: 2 },
      ],
      expected: ["a:a", "b:b", "c:c"],
    },
    {
      name: "excludes corpora at exactly 5%",
      corpora: [
        { corpus: "big", count: 95 },
        { corpus: "small", count: 5 },
      ],
      expected: ["big"],
    },
    {
      name: "custom threshold",
      corpora: [
        { corpus: "a:b", count: 50 },
        { corpus: "c:d", count: 30 },
        { corpus: "e:f", count: 20 },
      ],
      threshold: 25,
      expected: ["a:b", "c:d"],
    },
    {
      name: "all above threshold returns all",
      corpora: [
        { corpus: "a:b", count: 10 },
        { corpus: "c:d", count: 10 },
      ],
      expected: ["a:b", "c:d"],
    },
  ]

  it.each(cases)("$name", ({ corpora, threshold, expected }) => {
    expect(selectSignificantCorpora(corpora, threshold)).toEqual(expected)
  })
})
