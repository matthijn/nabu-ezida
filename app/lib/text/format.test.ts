import { describe, it, expect } from "vitest"
import { formatNumberedPassage } from "./format"

describe("formatNumberedPassage", () => {
  const cases: { name: string; sentences: string[]; expected: string }[] = [
    {
      name: "numbers from 1",
      sentences: ["Alpha.", "Beta.", "Gamma."],
      expected: "1: Alpha.\n2: Beta.\n3: Gamma.",
    },
    {
      name: "single sentence",
      sentences: ["Only one."],
      expected: "1: Only one.",
    },
    {
      name: "empty array",
      sentences: [],
      expected: "",
    },
  ]

  it.each(cases)("$name", ({ sentences, expected }) => {
    expect(formatNumberedPassage(sentences)).toBe(expected)
  })
})
