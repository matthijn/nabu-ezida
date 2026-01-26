import { describe, it, expect } from "vitest"
import { deduplicateName } from "./dedupe"

describe("deduplicateName", () => {
  const cases = [
    {
      name: "returns original when no conflict",
      input: "notes.md",
      existing: new Set<string>([]),
      expectOriginal: true,
    },
    {
      name: "returns original when different names exist",
      input: "notes.md",
      existing: new Set(["other.md", "another.md"]),
      expectOriginal: true,
    },
    {
      name: "appends suffix when name exists",
      input: "notes.md",
      existing: new Set(["notes.md"]),
      expectOriginal: false,
      expectPattern: /^notes-[a-z0-9]{4}\.md$/,
    },
    {
      name: "handles files without extension",
      input: "README",
      existing: new Set(["README"]),
      expectOriginal: false,
      expectPattern: /^README-[a-z0-9]{4}$/,
    },
    {
      name: "handles multiple dots in filename",
      input: "file.test.md",
      existing: new Set(["file.test.md"]),
      expectOriginal: false,
      expectPattern: /^file\.test-[a-z0-9]{4}\.md$/,
    },
  ]

  cases.forEach(({ name, input, existing, expectOriginal, expectPattern }) => {
    it(name, () => {
      const result = deduplicateName(input, existing)

      if (expectOriginal) {
        expect(result).toBe(input)
      } else {
        expect(result).not.toBe(input)
        expect(result).toMatch(expectPattern!)
        expect(existing.has(result)).toBe(false)
      }
    })
  })
})
