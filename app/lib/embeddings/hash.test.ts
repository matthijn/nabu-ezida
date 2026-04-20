import { describe, it, expect } from "vitest"
import { hashChunk } from "./hash"

describe("hashChunk", () => {
  const cases: { name: string; check: () => void }[] = [
    {
      name: "returns deterministic output",
      check: () => {
        expect(hashChunk("hello world")).toBe(hashChunk("hello world"))
      },
    },
    {
      name: "returns 16 character hex string",
      check: () => {
        expect(hashChunk("test input")).toMatch(/^[0-9a-f]{16}$/)
      },
    },
    {
      name: "produces different hashes for different inputs",
      check: () => {
        const inputs = [
          "hello world",
          "hello world!",
          "Hello world",
          "completely different",
          "",
          " ",
          "a",
          "b",
        ]
        const hashes = inputs.map(hashChunk)
        expect(new Set(hashes).size).toBe(inputs.length)
      },
    },
  ]

  it.each(cases)("$name", ({ check }) => check())
})
