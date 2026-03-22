import { describe, it, expect } from "vitest"
import { isEmbeddableFile } from "./filter"

describe("isEmbeddableFile", () => {
  const cases: { name: string; filename: string; expected: boolean }[] = [
    { name: "regular markdown", filename: "notes.md", expected: true },
    { name: "hidden file excluded", filename: "doc.hidden.md", expected: false },
    { name: "companion file excluded", filename: "doc.embeddings.hidden.md", expected: false },
    { name: "preferences excluded", filename: "preferences.md", expected: false },
    { name: "settings excluded", filename: "settings.hidden.md", expected: false },
    { name: "non-markdown excluded", filename: "readme.txt", expected: false },
    { name: "another regular file", filename: "chapter_one.md", expected: true },
  ]

  cases.forEach(({ name, filename, expected }) => {
    it(name, () => {
      expect(isEmbeddableFile(filename)).toBe(expected)
    })
  })
})
