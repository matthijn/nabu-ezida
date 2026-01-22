import { describe, it, expect } from "vitest"
import { computeTextFingerprint, hasSignificantTextDrift } from "./fingerprint"

describe("computeTextFingerprint", () => {
  it("empty text", () => {
    const fp = computeTextFingerprint("")
    expect(fp.tokenCount).toBe(0)
    expect(fp.frequencies.size).toBe(0)
  })

  it("counts tokens", () => {
    const fp = computeTextFingerprint("hello world hello")
    expect(fp.tokenCount).toBe(3)
    expect(fp.frequencies.get("hello")).toBe(2)
    expect(fp.frequencies.get("world")).toBe(1)
  })
})

describe("hasSignificantTextDrift", () => {
  const cases = [
    {
      name: "no drift for identical text",
      prev: "The quick brown fox jumps over the lazy dog",
      curr: "The quick brown fox jumps over the lazy dog",
      expected: false,
    },
    {
      name: "no drift for typo fix in longer text",
      prev: "The quick brown fox jumps over the lazy dog while running through the forest near the river bank",
      curr: "The quikc brown fox jumps over the lazy dog while running through the forest near the river bank",
      expected: false,
    },
    {
      name: "no drift for minor word addition",
      prev: "The quick brown fox jumps over the lazy dog",
      curr: "The very quick brown fox jumps over the lazy dog today",
      expected: false,
    },
    {
      name: "drift for completely different content",
      prev: "The quick brown fox jumps over the lazy dog",
      curr: "function computeHash(input: string): number { return 42 }",
      expected: true,
    },
    {
      name: "drift from empty to content",
      prev: "",
      curr: "Some actual content here",
      expected: true,
    },
    {
      name: "no drift for both empty",
      prev: "",
      curr: "",
      expected: false,
    },
    {
      name: "drift for desert story vs code",
      prev: "The vast desert stretched endlessly under the scorching sun. Camels walked slowly across the golden dunes.",
      curr: "const desert = { temp: 45, humidity: 10 }; function walk(camel) { return camel.move(); }",
      expected: true,
    },
  ]

  it.each(cases)("$name", ({ prev, curr, expected }) => {
    const prevFp = computeTextFingerprint(prev)
    const currFp = computeTextFingerprint(curr)
    expect(hasSignificantTextDrift(prevFp, currFp)).toBe(expected)
  })
})
