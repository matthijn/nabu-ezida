import { describe, it, expect } from "vitest"
import { detectLanguage } from "./detect"

describe("detectLanguage", () => {
  const cases: { name: string; input: string; expected: string | undefined }[] = [
    {
      name: "detects Dutch",
      input:
        "Dit is een tekst in het Nederlands die lang genoeg is om de taal te herkennen door het algoritme",
      expected: "nld",
    },
    {
      name: "detects English",
      input:
        "This is a text in English that is long enough for the language detection algorithm to work properly",
      expected: "eng",
    },
    {
      name: "returns undefined for empty string",
      input: "",
      expected: undefined,
    },
    {
      name: "returns undefined for too-short text",
      input: "hi",
      expected: undefined,
    },
  ]

  it.each(cases)("$name", ({ input, expected }) => {
    expect(detectLanguage(input)).toBe(expected)
  })
})
