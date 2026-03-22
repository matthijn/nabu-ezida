import { describe, it, expect } from "vitest"
import { hashChunk } from "./hash"

describe("hashChunk", () => {
  it("returns deterministic output", () => {
    const hash1 = hashChunk("hello world")
    const hash2 = hashChunk("hello world")
    expect(hash1).toBe(hash2)
  })

  it("returns 8 character hex string", () => {
    const hash = hashChunk("test input")
    expect(hash).toMatch(/^[0-9a-f]{8}$/)
  })

  it("produces different hashes for different inputs", () => {
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
    const unique = new Set(hashes)
    expect(unique.size).toBe(inputs.length)
  })
})
