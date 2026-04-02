import { describe, it, expect } from "vitest"
import { calloutToProse } from "./toProse"

describe("calloutToProse", () => {
  const cases: { name: string; input: Record<string, unknown>; expected: string | null }[] = [
    {
      name: "returns title and content",
      input: { title: "My Note", content: "Some details here" },
      expected: "My Note\nSome details here",
    },
    { name: "returns null when title missing", input: { content: "no title" }, expected: null },
    { name: "returns null when content missing", input: { title: "no content" }, expected: null },
    { name: "returns null for empty object", input: {}, expected: null },
  ]

  cases.forEach(({ name, input, expected }) => {
    it(name, () => expect(calloutToProse(input)).toBe(expected))
  })
})
