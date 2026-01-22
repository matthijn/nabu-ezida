import { describe, it, expect } from "vitest"
import { validateDocumentMeta } from "./validate"

describe("validateDocumentMeta", () => {
  const cases = [
    {
      name: "valid with tags",
      input: { tags: ["foo", "bar"] },
      expectSuccess: true,
      expectedData: { tags: ["foo", "bar"] },
    },
    {
      name: "valid with empty tags",
      input: { tags: [] },
      expectSuccess: true,
      expectedData: { tags: [] },
    },
    {
      name: "missing tags field is valid",
      input: {},
      expectSuccess: true,
      expectedData: {},
    },
    {
      name: "tags is not array",
      input: { tags: "not-an-array" },
      expectSuccess: false,
      expectedPath: "tags",
      expectedCurrent: { tags: "not-an-array" },
    },
    {
      name: "tags contains non-string",
      input: { tags: ["valid", 123, "also-valid"] },
      expectSuccess: false,
      expectedPath: "tags.1",
      expectedCurrent: { tags: ["valid", 123, "also-valid"] },
    },
    {
      name: "tags with invalid slug format",
      input: { tags: ["Valid Tag"] },
      expectSuccess: false,
      expectedPath: "tags.0",
      expectedCurrent: { tags: ["Valid Tag"] },
    },
    {
      name: "tags with valid slugs",
      input: { tags: ["code-book", "theme2", "my-tag-123"] },
      expectSuccess: true,
      expectedData: { tags: ["code-book", "theme2", "my-tag-123"] },
    },
    {
      name: "null input",
      input: null,
      expectSuccess: false,
      expectedPath: "",
      expectedCurrent: {},
    },
    {
      name: "extra fields are stripped",
      input: { tags: ["foo"], extra: "ignored" },
      expectSuccess: true,
      expectedData: { tags: ["foo"] },
    },
  ]

  it.each(cases)("$name", (testCase) => {
    const result = validateDocumentMeta(testCase.input)

    if (testCase.expectSuccess) {
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual(testCase.expectedData)
      }
    } else {
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.issues.length).toBeGreaterThan(0)
        expect(result.issues[0].path).toBe(testCase.expectedPath)
        expect(result.current).toEqual(testCase.expectedCurrent)
      }
    }
  })
})
