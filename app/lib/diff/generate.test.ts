import { describe, expect, it } from "vitest"
import { generateDiff } from "./generate"
import { applyDiff } from "./parse"

describe("generateDiff", () => {
  const cases = [
    {
      name: "empty to content creates add diff",
      oldContent: "",
      newContent: '{"tags": ["new"]}',
      expected: '@@\n+{"tags": ["new"]}',
    },
    {
      name: "whitespace-only old treated as empty",
      oldContent: "  \n  ",
      newContent: '{"tags": ["new"]}',
      expected: '@@\n+{"tags": ["new"]}',
    },
    {
      name: "identical content returns empty string",
      oldContent: '{"tags": ["same"]}',
      newContent: '{"tags": ["same"]}',
      expected: "",
    },
    {
      name: "different content creates replace diff",
      oldContent: '{"tags": ["old"]}',
      newContent: '{"tags": ["new"]}',
      expected: '@@\n-{"tags": ["old"]}\n+{"tags": ["new"]}',
    },
    {
      name: "multiline content creates multiline diff",
      oldContent: '{\n  "tags": ["old"]\n}',
      newContent: '{\n  "tags": ["new"]\n}',
      expected: '@@\n-{\n-  "tags": ["old"]\n-}\n+{\n+  "tags": ["new"]\n+}',
    },
    {
      name: "trims whitespace before comparing",
      oldContent: '  {"tags": ["same"]}  ',
      newContent: '{"tags": ["same"]}',
      expected: "",
    },
  ]

  it.each(cases)("$name", ({ oldContent, newContent, expected }) => {
    const result = generateDiff(oldContent, newContent)
    expect(result).toBe(expected)
  })

  it("roundtrip: generated diff can be applied", () => {
    const oldContent = '{"tags": ["old"]}'
    const newContent = '{\n  "tags": [\n    "new"\n  ]\n}'
    const diff = generateDiff(oldContent, newContent)
    const result = applyDiff(oldContent, diff)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.content).toBe(newContent)
    }
  })
})
