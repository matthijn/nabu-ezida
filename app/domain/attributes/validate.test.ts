import { describe, it, expect } from "vitest"
import {
  validateDocumentMeta,
  getChangedFields,
  validateField,
  validateFieldChanges,
  validateFieldChangesInternal,
  type FieldRejection,
} from "./validate"
import type { DocumentMeta, Annotation } from "./schema"

const testAnnotation = (overrides: Partial<Annotation> = {}): Annotation =>
  ({ text: "test", reason: "note", color: "red", code: undefined, ambiguity: { confidence: "high" }, ...overrides }) as Annotation

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

describe("getChangedFields", () => {
  const cases: {
    name: string
    original: Partial<DocumentMeta>
    patched: Partial<DocumentMeta>
    expected: string[]
  }[] = [
    {
      name: "no changes returns empty",
      original: { tags: ["foo"] },
      patched: { tags: ["foo"] },
      expected: [],
    },
    {
      name: "new field detected",
      original: {},
      patched: { tags: ["foo"] },
      expected: ["tags"],
    },
    {
      name: "removed field detected",
      original: { tags: ["foo"] },
      patched: {},
      expected: ["tags"],
    },
    {
      name: "changed field detected",
      original: { tags: ["foo"] },
      patched: { tags: ["bar"] },
      expected: ["tags"],
    },
    {
      name: "multiple changed fields",
      original: { tags: ["foo"] },
      patched: { tags: ["bar"], annotations: [] },
      expected: ["tags", "annotations"],
    },
    {
      name: "deep equality check on arrays",
      original: { tags: ["a", "b"] },
      patched: { tags: ["a", "b"] },
      expected: [],
    },
  ]

  it.each(cases)("$name", ({ original, patched, expected }) => {
    const result = getChangedFields(original, patched)
    expect(result.sort()).toEqual(expected.sort())
  })
})

describe("validateField", () => {
  const cases: {
    name: string
    field: keyof DocumentMeta
    value: unknown
    expectOk: boolean
  }[] = [
    {
      name: "valid tags",
      field: "tags",
      value: ["valid-tag"],
      expectOk: true,
    },
    {
      name: "invalid tags format",
      field: "tags",
      value: ["Invalid Tag"],
      expectOk: false,
    },
    {
      name: "tags not array",
      field: "tags",
      value: "not-array",
      expectOk: false,
    },
    {
      name: "undefined tags valid",
      field: "tags",
      value: undefined,
      expectOk: true,
    },
    {
      name: "valid annotations",
      field: "annotations",
      value: [testAnnotation()],
      expectOk: true,
    },
    {
      name: "invalid annotation missing reason",
      field: "annotations",
      value: [{ text: "test", color: "red" }],
      expectOk: false,
    },
  ]

  it.each(cases)("$name", ({ field, value, expectOk }) => {
    const result = validateField(field, value as DocumentMeta[typeof field])
    expect(result.ok).toBe(expectOk)
  })
})

describe("validateFieldChanges", () => {
  const cases: {
    name: string
    original: Partial<DocumentMeta>
    patched: Partial<DocumentMeta>
    expectAccepted: Partial<DocumentMeta>
    expectRejectedFields: string[]
    expectRejectedReasons: FieldRejection["reason"][]
  }[] = [
    {
      name: "valid tags accepted",
      original: {},
      patched: { tags: ["valid-tag"] },
      expectAccepted: { tags: ["valid-tag"] },
      expectRejectedFields: [],
      expectRejectedReasons: [],
    },
    {
      name: "invalid tags rejected, keeps original",
      original: { tags: ["old"] },
      patched: { tags: ["Invalid Tag"] },
      expectAccepted: { tags: ["old"] },
      expectRejectedFields: ["tags"],
      expectRejectedReasons: ["invalid"],
    },
    {
      name: "annotations accepted",
      original: {},
      patched: { annotations: [testAnnotation()] },
      expectAccepted: { annotations: [testAnnotation()] },
      expectRejectedFields: [],
      expectRejectedReasons: [],
    },
    {
      name: "valid tags and annotations both accepted",
      original: {},
      patched: {
        tags: ["valid-tag"],
        annotations: [testAnnotation()],
      },
      expectAccepted: {
        tags: ["valid-tag"],
        annotations: [testAnnotation()],
      },
      expectRejectedFields: [],
      expectRejectedReasons: [],
    },
    {
      name: "invalid tags rejected, valid annotations accepted",
      original: {},
      patched: {
        tags: ["Invalid Tag"],
        annotations: [testAnnotation()],
      },
      expectAccepted: { annotations: [testAnnotation()] },
      expectRejectedFields: ["tags"],
      expectRejectedReasons: ["invalid"],
    },
    {
      name: "unchanged fields not in rejected",
      original: { tags: ["same"] },
      patched: { tags: ["same"] },
      expectAccepted: { tags: ["same"] },
      expectRejectedFields: [],
      expectRejectedReasons: [],
    },
  ]

  it.each(cases)(
    "$name",
    ({ original, patched, expectAccepted, expectRejectedFields, expectRejectedReasons }) => {
      const result = validateFieldChanges(original, patched)

      expect(result.accepted).toEqual(expectAccepted)

      const rejectedFields = result.rejected.map((r) => r.field)
      expect(rejectedFields.sort()).toEqual(expectRejectedFields.sort())

      const rejectedReasons = result.rejected.map((r) => r.reason)
      expect(rejectedReasons.sort()).toEqual(expectRejectedReasons.sort())
    }
  )

})

describe("validateFieldChangesInternal", () => {
  it("accepts valid annotations", () => {
    const patched = {
      annotations: [testAnnotation()],
    }
    const result = validateFieldChangesInternal({}, patched)
    expect(result.rejected).toEqual([])
    expect(result.accepted).toEqual(patched)
  })

  it("still rejects invalid annotations", () => {
    const patched = { annotations: [{ text: "missing reason" }] as unknown }
    const result = validateFieldChangesInternal({}, patched as Partial<DocumentMeta>)
    expect(result.rejected[0].field).toBe("annotations")
    expect(result.rejected[0].reason).toBe("invalid")
  })
})
