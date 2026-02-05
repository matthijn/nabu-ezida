import { describe, it, expect } from "vitest"
import { resolveFuzzyPatterns, hasFuzzyPatterns } from "./fuzzy-inline"

describe("resolveFuzzyPatterns", () => {
  type TestCase = {
    name: string
    patch: string
    target: string
    expectedPatch: string
    expectedResolved: number
    expectedUnresolved: string[]
  }

  const cases: TestCase[] = [
    {
      name: "exact match replaces",
      patch: '{ "text": "FUZZY[hello world]" }',
      target: "This is hello world in a document.",
      expectedPatch: '{ "text": "hello world" }',
      expectedResolved: 1,
      expectedUnresolved: [],
    },
    {
      name: "fuzzy match with typo",
      patch: '{ "text": "FUZZY[hello worlld]" }',
      target: "This is hello world in a document.",
      expectedPatch: '{ "text": "hello world" }',
      expectedResolved: 1,
      expectedUnresolved: [],
    },
    {
      name: "multiple patterns",
      patch: '{ "a": "FUZZY[first text]", "b": "FUZZY[second text]" }',
      target: "Here is the first text and also second text present.",
      expectedPatch: '{ "a": "first text", "b": "second text" }',
      expectedResolved: 2,
      expectedUnresolved: [],
    },
    {
      name: "no match returns unresolved",
      patch: '{ "text": "FUZZY[not in document]" }',
      target: "This content has nothing matching.",
      expectedPatch: '{ "text": "FUZZY[not in document]" }',
      expectedResolved: 0,
      expectedUnresolved: ["not in document"],
    },
    {
      name: "no patterns unchanged",
      patch: '{ "text": "regular text" }',
      target: "Any content here.",
      expectedPatch: '{ "text": "regular text" }',
      expectedResolved: 0,
      expectedUnresolved: [],
    },
    {
      name: "handles whitespace differences",
      patch: '{ "text": "FUZZY[hello   world]" }',
      target: "hello world is here",
      expectedPatch: '{ "text": "hello world" }',
      expectedResolved: 1,
      expectedUnresolved: [],
    },
  ]

  it.each(cases)("$name", ({ patch, target, expectedPatch, expectedResolved, expectedUnresolved }) => {
    const result = resolveFuzzyPatterns(patch, target)
    expect(result.patch).toBe(expectedPatch)
    expect(result.resolved).toBe(expectedResolved)
    expect(result.unresolved).toEqual(expectedUnresolved)
  })
})

describe("hasFuzzyPatterns", () => {
  type TestCase = {
    name: string
    content: string
    expected: boolean
  }

  const cases: TestCase[] = [
    { name: "with pattern", content: "FUZZY[text]", expected: true },
    { name: "without pattern", content: "regular text", expected: false },
    { name: "similar but not pattern", content: "FUZZY text", expected: false },
  ]

  it.each(cases)("$name", ({ content, expected }) => {
    expect(hasFuzzyPatterns(content)).toBe(expected)
  })
})
