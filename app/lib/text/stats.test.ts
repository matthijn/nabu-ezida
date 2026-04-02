import { describe, it, expect } from "vitest"
import { computeTextStats, formatReadingTime } from "./stats"

describe("computeTextStats", () => {
  const cases: {
    name: string
    input: string
    expected: { chars: number; words: number }
  }[] = [
    { name: "empty string", input: "", expected: { chars: 0, words: 0 } },
    { name: "single word", input: "hello", expected: { chars: 5, words: 1 } },
    { name: "multiple words", input: "hello world foo", expected: { chars: 15, words: 3 } },
    { name: "whitespace only", input: "   \n\t  ", expected: { chars: 7, words: 0 } },
    {
      name: "multiline text",
      input: "line one\nline two\nline three",
      expected: { chars: 28, words: 6 },
    },
  ]

  cases.forEach(({ name, input, expected }) => {
    it(name, () => {
      const stats = computeTextStats(input)
      expect(stats.chars).toBe(expected.chars)
      expect(stats.words).toBe(expected.words)
      expect(stats.estimatedTokens).toBe(Math.ceil(expected.chars / 4))
      expect(stats.readingTimeMinutes).toBeCloseTo(expected.words / 238, 5)
    })
  })
})

describe("formatReadingTime", () => {
  const cases: { name: string; minutes: number; expected: string }[] = [
    { name: "under one minute", minutes: 0.3, expected: "< 1 min read" },
    { name: "exactly one minute", minutes: 1, expected: "1 min read" },
    { name: "several minutes", minutes: 5.4, expected: "5 min read" },
    { name: "rounds up", minutes: 7.6, expected: "8 min read" },
  ]

  cases.forEach(({ name, minutes, expected }) => {
    it(name, () => expect(formatReadingTime(minutes)).toBe(expected))
  })
})
