import { describe, it, expect } from "vitest"
import {
  normalizeFilename,
  toDisplayName,
  boldMissingFile,
  isProtectedFile,
  isHiddenFile,
  PREFERENCES_FILE,
  SETTINGS_FILE,
} from "./filename"

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
    { input: "settings.hidden.md", expected: "Settings" },
    { input: "debug.hidden.md", expected: "Debug" },
  ]
  cases.forEach(({ input, expected }) =>
    it(`"${input}" → "${expected}"`, () => expect(toDisplayName(input)).toBe(expected))
  )
})

describe("boldMissingFile", () => {
  const cases = [
    { input: "codebook_general.md", expected: "**Codebook General**" },
    { input: "interview-notes.md", expected: "**Interview-Notes**" },
    { input: "annotation-1a2b3c4d", expected: null },
    { input: "callout-7xk2m9p1", expected: null },
    { input: "not_a_file", expected: null },
  ]
  cases.forEach(({ input, expected }) =>
    it(`"${input}" → ${expected ?? "null"}`, () => expect(boldMissingFile(input)).toBe(expected))
  )
})

describe("isProtectedFile", () => {
  const cases = [
    { input: PREFERENCES_FILE, expected: true },
    { input: SETTINGS_FILE, expected: true },
    { input: "some_doc.md", expected: false },
    { input: "debug.hidden.md", expected: false },
  ]
  cases.forEach(({ input, expected }) =>
    it(`"${input}" → ${expected}`, () => expect(isProtectedFile(input)).toBe(expected))
  )
})

describe("isHiddenFile", () => {
  const cases = [
    { input: "settings.hidden.md", expected: true },
    { input: "debug.hidden.md", expected: true },
    { input: "preferences.md", expected: false },
    { input: "my_doc.md", expected: false },
  ]
  cases.forEach(({ input, expected }) =>
    it(`"${input}" → ${expected}`, () => expect(isHiddenFile(input)).toBe(expected))
  )
})
