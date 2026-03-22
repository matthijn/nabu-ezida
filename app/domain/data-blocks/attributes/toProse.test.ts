import { describe, it, expect } from "vitest"
import { attributesToProse } from "./toProse"

describe("attributesToProse", () => {
  const cases: { name: string; input: unknown; expected: string | null }[] = [
    {
      name: "single annotation with text and reason",
      input: {
        annotations: [{ text: "important phrase", reason: "key concept" }],
      },
      expected: "important phrase\nkey concept",
    },
    {
      name: "annotation with review included",
      input: {
        annotations: [
          { text: "unclear passage", reason: "needs clarification", review: "check source" },
        ],
      },
      expected: "unclear passage\nneeds clarification\nReview: check source",
    },
    {
      name: "multiple annotations joined by double newline",
      input: {
        annotations: [
          { text: "first", reason: "reason one" },
          { text: "second", reason: "reason two" },
        ],
      },
      expected: "first\nreason one\n\nsecond\nreason two",
    },
    {
      name: "empty annotations returns null",
      input: { annotations: [] },
      expected: null,
    },
    {
      name: "no annotations field returns null",
      input: {},
      expected: null,
    },
    {
      name: "tags only returns null",
      input: { tags: ["research", "draft"] },
      expected: null,
    },
  ]

  cases.forEach(({ name, input, expected }) => {
    it(name, () => {
      expect(attributesToProse(input)).toBe(expected)
    })
  })
})
