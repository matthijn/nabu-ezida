import { describe, it, expect } from "vitest"
import { normalizeFilename, toDisplayName } from "./filename"

describe("normalizeFilename", () => {
  const cases = [
    { input: "My File.md", expected: "my_file.md" },
    { input: "PREFERENCES.md", expected: "preferences.md" },
    { input: "already_normal.md", expected: "already_normal.md" },
    { input: "Mixed Case With Spaces.md", expected: "mixed_case_with_spaces.md" },
    { input: "  extra  spaces  .md", expected: "__extra__spaces__.md" },
  ]
  cases.forEach(({ input, expected }) =>
    it(`"${input}" → "${expected}"`, () => expect(normalizeFilename(input)).toBe(expected))
  )
})

describe("toDisplayName", () => {
  const cases = [
    { input: "preferences.md", expected: "Preferences" },
    { input: "my_interview_notes.md", expected: "My Interview Notes" },
    { input: "already.md", expected: "Already" },
    { input: "no_extension", expected: "No Extension" },
    { input: "multi_word_file_name.md", expected: "Multi Word File Name" },
  ]
  cases.forEach(({ input, expected }) =>
    it(`"${input}" → "${expected}"`, () => expect(toDisplayName(input)).toBe(expected))
  )
})
