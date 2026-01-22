import { describe, it, expect } from "vitest"
import { tokenize, buildFrequencies, tokenOverlap } from "./tokens"

describe("tokenize", () => {
  const cases = [
    { name: "empty text", input: "", expected: [] as string[] },
    { name: "single word", input: "hello", expected: ["hello"] },
    { name: "multiple words", input: "hello world", expected: ["hello", "world"] },
    { name: "case insensitive", input: "Hello WORLD", expected: ["hello", "world"] },
    { name: "strips punctuation", input: "hello, world!", expected: ["hello", "world"] },
    { name: "handles numbers", input: "test123 456", expected: ["test123", "456"] },
    { name: "preserves word order", input: "one two three", expected: ["one", "two", "three"] },
    { name: "handles multiple spaces", input: "hello   world", expected: ["hello", "world"] },
    { name: "handles newlines", input: "hello\nworld", expected: ["hello", "world"] },
  ]

  it.each(cases)("$name", ({ input, expected }) => {
    expect(tokenize(input)).toEqual(expected)
  })
})

describe("buildFrequencies", () => {
  const cases = [
    { name: "empty", tokens: [] as string[], expected: new Map<string, number>() },
    { name: "single token", tokens: ["hello"], expected: new Map([["hello", 1]]) },
    { name: "duplicates", tokens: ["hello", "hello", "world"], expected: new Map([["hello", 2], ["world", 1]]) },
  ]

  it.each(cases)("$name", ({ tokens, expected }) => {
    expect(buildFrequencies(tokens)).toEqual(expected)
  })
})

describe("tokenOverlap", () => {
  const cases = [
    { name: "both empty", a: [], b: [], expected: 1 },
    { name: "a empty", a: [], b: ["hello"], expected: 0 },
    { name: "b empty", a: ["hello"], b: [], expected: 0 },
    { name: "identical", a: ["hello", "world"], b: ["hello", "world"], expected: 1 },
    { name: "no overlap", a: ["hello"], b: ["world"], expected: 0 },
    { name: "partial overlap", a: ["hello", "world"], b: ["hello", "foo"], expected: 0.5 },
    { name: "subset", a: ["hello"], b: ["hello", "world"], expected: 0.5 },
    { name: "frequency matters", a: ["hello", "hello"], b: ["hello"], expected: 0.5 },
  ]

  it.each(cases)("$name", ({ a, b, expected }) => {
    const freqA = buildFrequencies(a)
    const freqB = buildFrequencies(b)
    expect(tokenOverlap(freqA, freqB, a.length, b.length)).toBe(expected)
  })
})
