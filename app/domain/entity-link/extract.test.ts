import { describe, test, expect } from "vitest"
import { extractEntityIdCandidates } from "./extract"

describe("extractEntityIdCandidates", () => {
  const cases = [
    {
      name: "no candidates in plain text",
      input: "This is a normal message with no IDs",
      expected: [],
    },
    {
      name: "bare annotation ID",
      input: "See annotation-1a2b3c4d for details",
      expected: ["annotation-1a2b3c4d"],
    },
    {
      name: "bare callout ID",
      input: "Check callout-7xk2m9p1 here",
      expected: ["callout-7xk2m9p1"],
    },
    {
      name: "ID inside markdown link",
      input: "See [frustration](file://annotation-1a2b3c4d) for details",
      expected: ["annotation-1a2b3c4d"],
    },
    {
      name: "multiple different IDs",
      input: "Compare annotation-1a2b3c4d and callout-7xk2m9p1",
      expected: ["annotation-1a2b3c4d", "callout-7xk2m9p1"],
    },
    {
      name: "duplicate IDs deduplicated",
      input: "See annotation-1a2b3c4d and again annotation-1a2b3c4d",
      expected: ["annotation-1a2b3c4d"],
    },
    {
      name: "malformed ID with underscores",
      input: "Found annotation-user_frustration here",
      expected: ["annotation-user_frustration"],
    },
    {
      name: "malformed ID with dashes",
      input: "Found callout-my-code-123 here",
      expected: ["callout-my-code-123"],
    },
    {
      name: "ID at end of sentence with period",
      input: "See annotation-abc12345.",
      expected: ["annotation-abc12345"],
    },
    {
      name: "ID in parentheses",
      input: "(annotation-abc12345)",
      expected: ["annotation-abc12345"],
    },
    {
      name: "ID in backticks",
      input: "Use `annotation-abc12345` here",
      expected: ["annotation-abc12345"],
    },
    {
      name: "ignores bare prefix without suffix",
      input: "The annotation- prefix is used",
      expected: [],
    },
    {
      name: "ID in code block",
      input: '```json\n{"id": "annotation-abc12345"}\n```',
      expected: ["annotation-abc12345"],
    },
  ] as const

  test.each(cases)("$name", ({ input, expected }) => {
    expect(extractEntityIdCandidates(input)).toEqual(expected)
  })
})
