import { describe, it, expect } from "vitest"
import { dedupArray, dedupArraysIn } from "./dedup"

describe("dedupArray", () => {
  const cases = [
    {
      name: "removes duplicate primitives",
      input: [1, 2, 2, 3, 1],
      expected: [1, 2, 3],
    },
    {
      name: "removes duplicate strings",
      input: ["a", "b", "a", "c"],
      expected: ["a", "b", "c"],
    },
    {
      name: "removes identical objects",
      input: [
        { text: "hello", color: "amber" },
        { text: "hello", color: "amber" },
      ],
      expected: [{ text: "hello", color: "amber" }],
    },
    {
      name: "keeps objects with any field difference",
      input: [
        { text: "hello", color: "amber" },
        { text: "hello", color: "red" },
      ],
      expected: [
        { text: "hello", color: "amber" },
        { text: "hello", color: "red" },
      ],
    },
    {
      name: "handles different key ordering as equal",
      input: [
        { a: 1, b: 2 },
        { b: 2, a: 1 },
      ],
      expected: [{ a: 1, b: 2 }],
    },
    {
      name: "handles nested objects",
      input: [
        { data: { x: 1, y: 2 } },
        { data: { y: 2, x: 1 } },
      ],
      expected: [{ data: { x: 1, y: 2 } }],
    },
    {
      name: "returns empty for empty array",
      input: [],
      expected: [],
    },
    {
      name: "returns unchanged when no duplicates",
      input: [{ id: 1 }, { id: 2 }, { id: 3 }],
      expected: [{ id: 1 }, { id: 2 }, { id: 3 }],
    },
    {
      name: "keeps first occurrence",
      input: ["first", "second", "first"],
      expected: ["first", "second"],
    },
  ]

  it.each(cases)("$name", ({ input, expected }) => {
    expect(dedupArray(input)).toEqual(expected)
  })
})

describe("dedupArraysIn", () => {
  const cases = [
    {
      name: "deduplicates top-level array values",
      input: { tags: ["a", "a", "b"], name: "test" },
      expected: { tags: ["a", "b"], name: "test" },
    },
    {
      name: "deduplicates nested object arrays",
      input: {
        annotations: [
          { text: "hello", reason: "test" },
          { text: "hello", reason: "test" },
          { text: "world", reason: "other" },
        ],
      },
      expected: {
        annotations: [
          { text: "hello", reason: "test" },
          { text: "world", reason: "other" },
        ],
      },
    },
    {
      name: "leaves non-array values unchanged",
      input: { name: "test", count: 5, active: true },
      expected: { name: "test", count: 5, active: true },
    },
    {
      name: "handles deeply nested arrays",
      input: { a: { b: { items: [1, 1, 2] } } },
      expected: { a: { b: { items: [1, 2] } } },
    },
    {
      name: "passes through primitives",
      input: "hello",
      expected: "hello",
    },
    {
      name: "passes through null",
      input: null,
      expected: null,
    },
  ]

  it.each(cases)("$name", ({ input, expected }) => {
    expect(dedupArraysIn(input)).toEqual(expected)
  })
})
