import { describe, test, expect } from "vitest"
import { filterMatchingAnnotations } from "./annotations"

describe("filterMatchingAnnotations", () => {
  const cases = [
    {
      name: "returns matching annotations",
      annotations: [{ text: "hello" }, { text: "world" }],
      prose: "hello there",
      expected: [{ text: "hello" }],
    },
    {
      name: "returns empty when no matches",
      annotations: [{ text: "foo" }],
      prose: "bar baz",
      expected: [],
    },
    {
      name: "returns all when all match",
      annotations: [{ text: "a" }, { text: "b" }],
      prose: "a b c",
      expected: [{ text: "a" }, { text: "b" }],
    },
    {
      name: "handles empty annotations",
      annotations: [],
      prose: "some text",
      expected: [],
    },
    {
      name: "handles empty prose",
      annotations: [{ text: "hello" }],
      prose: "",
      expected: [],
    },
    {
      name: "preserves extra fields",
      annotations: [{ text: "hello", color: "red" }, { text: "world", color: "blue" }],
      prose: "hello there",
      expected: [{ text: "hello", color: "red" }],
    },
  ]

  test.each(cases)("$name", ({ annotations, prose, expected }) => {
    expect(filterMatchingAnnotations(annotations, prose)).toEqual(expected)
  })
})
