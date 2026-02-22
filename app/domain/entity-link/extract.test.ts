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
      input: "See annotation_1a2b3c4d for details",
      expected: ["annotation_1a2b3c4d"],
    },
    {
      name: "bare callout ID",
      input: "Check callout_7xk2m9p1 here",
      expected: ["callout_7xk2m9p1"],
    },
    {
      name: "ID inside markdown link",
      input: "See [frustration](file://annotation_1a2b3c4d) for details",
      expected: ["annotation_1a2b3c4d"],
    },
    {
      name: "multiple different IDs",
      input: "Compare annotation_1a2b3c4d and callout_7xk2m9p1",
      expected: ["annotation_1a2b3c4d", "callout_7xk2m9p1"],
    },
    {
      name: "duplicate IDs deduplicated",
      input: "See annotation_1a2b3c4d and again annotation_1a2b3c4d",
      expected: ["annotation_1a2b3c4d"],
    },
    {
      name: "malformed ID with underscores",
      input: "Found annotation_user_frustration here",
      expected: ["annotation_user_frustration"],
    },
    {
      name: "malformed ID with dashes",
      input: "Found callout_my-code-123 here",
      expected: ["callout_my-code-123"],
    },
    {
      name: "ID at end of sentence with period",
      input: "See annotation_abc12345.",
      expected: ["annotation_abc12345"],
    },
    {
      name: "ID in parentheses",
      input: "(annotation_abc12345)",
      expected: ["annotation_abc12345"],
    },
    {
      name: "ID in backticks",
      input: "Use `annotation_abc12345` here",
      expected: ["annotation_abc12345"],
    },
    {
      name: "ignores bare prefix without suffix",
      input: "The annotation_ prefix is used",
      expected: [],
    },
    {
      name: "ID in code block",
      input: "```json\n{\"id\": \"annotation_abc12345\"}\n```",
      expected: ["annotation_abc12345"],
    },
  ] as const

  test.each(cases)("$name", ({ input, expected }) => {
    expect(extractEntityIdCandidates(input)).toEqual(expected)
  })
})
