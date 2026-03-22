import { describe, it, expect } from "vitest"
import { chunkText, type Chunk } from "./chunk"
import { TARGET_CHUNK_SIZE, MIN_CHUNK_SIZE } from "./constants"

describe("chunkText", () => {
  const cases: { name: string; input: string; check: (chunks: Chunk[]) => void }[] = [
    {
      name: "empty text returns no chunks",
      input: "",
      check: (chunks) => expect(chunks).toEqual([]),
    },
    {
      name: "whitespace only returns no chunks",
      input: "   \n\n   ",
      check: (chunks) => expect(chunks).toEqual([]),
    },
    {
      name: "short text stays as one chunk",
      input: "Hello world. This is a test.",
      check: (chunks) => {
        expect(chunks).toHaveLength(1)
        expect(chunks[0].text).toBe("Hello world. This is a test.")
        expect(chunks[0].index).toBe(0)
      },
    },
    {
      name: "heading prepends to next segment",
      input: "# Title\n\nContent below heading",
      check: (chunks) => {
        expect(chunks).toHaveLength(1)
        expect(chunks[0].text).toContain("# Title")
        expect(chunks[0].text).toContain("Content below heading")
      },
    },
    {
      name: "multiple paragraphs merge when small",
      input: "First paragraph.\n\nSecond paragraph.\n\nThird paragraph.",
      check: (chunks) => {
        expect(chunks).toHaveLength(1)
        expect(chunks[0].text).toContain("First paragraph.")
        expect(chunks[0].text).toContain("Third paragraph.")
      },
    },
    {
      name: "large text splits into multiple chunks",
      input: Array.from({ length: 20 }, (_, i) => `Paragraph ${i}. ${"x".repeat(200)}`).join(
        "\n\n"
      ),
      check: (chunks) => {
        expect(chunks.length).toBeGreaterThan(1)
        chunks.forEach((chunk) => {
          expect(chunk.text.length).toBeLessThanOrEqual(TARGET_CHUNK_SIZE + 200)
        })
      },
    },
    {
      name: "chunks have sequential indices",
      input: Array.from({ length: 20 }, (_, i) => `Paragraph ${i}. ${"x".repeat(200)}`).join(
        "\n\n"
      ),
      check: (chunks) => {
        chunks.forEach((chunk, i) => {
          expect(chunk.index).toBe(i)
        })
      },
    },
    {
      name: "chunks have deterministic hashes",
      input: "Hello world.\n\nAnother paragraph.",
      check: (chunks) => {
        const second = chunkText("Hello world.\n\nAnother paragraph.")
        expect(chunks.map((c) => c.hash)).toEqual(second.map((c) => c.hash))
      },
    },
    {
      name: "small trailing chunks merge with previous",
      input: `${"x".repeat(MIN_CHUNK_SIZE + 100)}\n\nTiny`,
      check: (chunks) => {
        expect(chunks).toHaveLength(1)
      },
    },
  ]

  cases.forEach(({ name, input, check }) => {
    it(name, () => {
      check(chunkText(input))
    })
  })

  it("no chunk is below MIN_CHUNK_SIZE except when total text is small", () => {
    const longText = Array.from({ length: 30 }, (_, i) => `Segment ${i}. ${"y".repeat(150)}`).join(
      "\n\n"
    )
    const chunks = chunkText(longText)
    if (chunks.length > 1) {
      chunks.forEach((chunk) => {
        expect(chunk.text.length).toBeGreaterThanOrEqual(MIN_CHUNK_SIZE)
      })
    }
  })
})
