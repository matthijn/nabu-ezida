import { describe, it, expect } from "vitest"
import { fillMissingIds, replaceUuidPlaceholders, isSystemId } from "./uuid"

describe("isSystemId", () => {
  const cases = [
    { id: "callout-3k8m2n4p", prefix: "callout", expected: true, name: "valid callout ID" },
    {
      id: "annotation-7abc123d",
      prefix: "annotation",
      expected: true,
      name: "valid annotation ID",
    },
    { id: "code_fiscal-reporting", prefix: "callout", expected: false, name: "wrong prefix" },
    { id: "callout-my-custom-id", prefix: "callout", expected: false, name: "hyphens in suffix" },
    { id: "callout-abc", prefix: "callout", expected: false, name: "suffix too short" },
    { id: "callout-ABCDEFGH", prefix: "callout", expected: false, name: "uppercase in suffix" },
    { id: "", prefix: "callout", expected: false, name: "empty string" },
    { id: "tag-transcript", prefix: "tag", expected: false, name: "pure-alpha slug" },
    { id: "tag-codebook", prefix: "tag", expected: false, name: "pure-alpha word" },
    {
      id: "annotation-abcdefgh",
      prefix: "annotation",
      expected: false,
      name: "all letters no digits",
    },
  ]

  it.each(cases)("$name", ({ id, prefix, expected }) => {
    expect(isSystemId(id, prefix)).toBe(expected)
  })
})

describe("fillMissingIds", () => {
  type FillResult = ReturnType<typeof fillMissingIds>
  interface FillCase {
    name: string
    input: string
    check: (r: FillResult, input: string) => void
  }

  const cases: FillCase[] = [
    {
      name: "fills missing id on json-callout block",
      input: '# Doc\n\n```json-callout\n{\n  "title": "My Callout"\n}\n```',
      check: (r) => {
        expect(r.generated).toHaveLength(1)
        expect(r.generated[0].type).toBe("json-callout")
        expect(r.generated[0].label).toBe("My Callout")
        expect(r.content).toContain(`"id": "${r.generated[0].id}"`)
      },
    },
    {
      name: "preserves existing id on json-callout block",
      input:
        '# Doc\n\n```json-callout\n{\n  "id": "existing_123",\n  "title": "My Callout"\n}\n```',
      check: (r, input) => {
        expect(r.generated).toHaveLength(0)
        expect(r.content).toBe(input)
      },
    },
    {
      name: "fills missing id on json-annotations",
      input:
        '# Doc\n\n```json-annotations\n{ "annotations": [\n  { "text": "hello", "reason": "test", "color": "blue" }\n] }\n```',
      check: (r) => {
        expect(r.generated).toHaveLength(1)
        expect(r.generated[0].type).toBe("json-annotations.annotations")
        expect(r.generated[0].id).toMatch(/^annotation-/)
        expect(r.content).toContain(`"id": "${r.generated[0].id}"`)
      },
    },
    {
      name: "fills multiple missing annotation ids",
      input:
        '# Doc\n\n```json-annotations\n{ "annotations": [\n  { "text": "first", "reason": "a", "color": "blue" },\n  { "text": "second", "reason": "b", "color": "red" }\n] }\n```',
      check: (r) => {
        expect(r.generated).toHaveLength(2)
        expect(r.generated[0].id).toMatch(/^annotation-/)
        expect(r.generated[1].id).toMatch(/^annotation-/)
        expect(r.generated[0].id).not.toBe(r.generated[1].id)
      },
    },
    {
      name: "preserves existing annotation ids",
      input:
        '# Doc\n\n```json-annotations\n{ "annotations": [\n  { "id": "ann_existing", "text": "hello", "reason": "test", "color": "blue" }\n] }\n```',
      check: (r, input) => {
        expect(r.generated).toHaveLength(0)
        expect(r.content).toBe(input)
      },
    },
    {
      name: "fills only missing ids in mixed annotation array",
      input:
        '# Doc\n\n```json-annotations\n{ "annotations": [\n  { "id": "ann_existing", "text": "first", "reason": "a", "color": "blue" },\n  { "text": "second", "reason": "b", "color": "red" }\n] }\n```',
      check: (r) => {
        expect(r.generated).toHaveLength(1)
        expect(r.content).toContain("ann_existing")
        expect(r.content).toContain(r.generated[0].id)
      },
    },
    {
      name: "handles document with no json blocks",
      input: "# Just text\n\nNo blocks here.",
      check: (r, input) => {
        expect(r.generated).toHaveLength(0)
        expect(r.content).toBe(input)
      },
    },
  ]

  it.each(cases)("$name", ({ input, check }) => check(fillMissingIds(input), input))

  describe("malformed ID normalization", () => {
    const calloutBlock = (id: string) => `# Doc

\`\`\`json-callout
{
  "id": "${id}",
  "title": "Test"
}
\`\`\``

    const annotationBlock = (id: string) => `# Doc

\`\`\`json-annotations
{ "annotations": [
  { "id": "${id}", "text": "hello", "reason": "test", "color": "blue" }
] }
\`\`\``

    const emptyOriginal = "# Doc\n\nSome content"

    const cases = [
      {
        name: "normalizes malformed callout ID when original provided",
        input: calloutBlock("code_fiscal-reporting"),
        original: emptyOriginal,
        expectNormalized: true,
        expectedPrefix: /^callout-/,
        expectedSource: "code_fiscal-reporting",
      },
      {
        name: "preserves malformed ID when no original provided",
        input: calloutBlock("code_fiscal-reporting"),
        original: undefined,
        expectNormalized: false,
      },
      {
        name: "preserves malformed ID present in original content",
        input: calloutBlock("code_fiscal-reporting"),
        original: calloutBlock("code_fiscal-reporting"),
        expectNormalized: false,
      },
      {
        name: "preserves system-format callout ID",
        input: calloutBlock("callout-3k8m2n4p"),
        original: emptyOriginal,
        expectNormalized: false,
      },
      {
        name: "normalizes malformed annotation ID",
        input: annotationBlock("my-annotation"),
        original: emptyOriginal,
        expectNormalized: true,
        expectedPrefix: /^annotation-/,
        expectedSource: "my-annotation",
      },
      {
        name: "preserves system-format annotation ID",
        input: annotationBlock("annotation-7abc123d"),
        original: emptyOriginal,
        expectNormalized: false,
      },
    ]

    it.each(cases)(
      "$name",
      ({ input, original, expectNormalized, expectedPrefix, expectedSource }) => {
        const result = fillMissingIds(input, original)

        if (expectNormalized) {
          if (!expectedPrefix) throw new Error("expected expectedPrefix")
          expect(result.generated).toHaveLength(1)
          expect(result.generated[0].id).toMatch(expectedPrefix)
          expect(result.generated[0].source).toBe(expectedSource)
          expect(result.content).toContain(result.generated[0].id)
          expect(result.content).not.toContain(expectedSource)
        } else {
          expect(result.generated).toHaveLength(0)
          expect(result.content).toBe(input)
        }
      }
    )

    it("returns same normalized ID for same malformed ID across calls", () => {
      const first = fillMissingIds(calloutBlock("my-custom-id"), emptyOriginal)
      const second = fillMissingIds(calloutBlock("my-custom-id"), emptyOriginal)

      expect(first.generated[0].id).toBe(second.generated[0].id)
    })
  })
})

describe("replaceUuidPlaceholders", () => {
  type ReplaceResult = ReturnType<typeof replaceUuidPlaceholders>
  interface ReplaceCase {
    name: string
    input: string
    check: (r: ReplaceResult, input: string) => void
  }

  const cases: ReplaceCase[] = [
    {
      name: "replaces single placeholder",
      input: '{"id": "[uuid-callout-1]"}',
      check: (r) => {
        expect(r.generated).toHaveProperty("callout-1")
        expect(r.result).toContain(r.generated["callout-1"])
        expect(r.result).not.toContain("[uuid-")
      },
    },
    {
      name: "replaces same placeholder with same id",
      input: '{"id": "[uuid-ref-1]", "ref": "[uuid-ref-1]"}',
      check: (r) => {
        expect(Object.keys(r.generated)).toHaveLength(1)
        const id = r.generated["ref-1"]
        expect(r.result).toBe(`{"id": "${id}", "ref": "${id}"}`)
      },
    },
    {
      name: "replaces different placeholders with different ids",
      input: '{"a": "[uuid-first]", "b": "[uuid-second]"}',
      check: (r) => {
        expect(Object.keys(r.generated)).toHaveLength(2)
        expect(r.generated["first"]).not.toBe(r.generated["second"])
      },
    },
    {
      name: "leaves content without placeholders unchanged",
      input: '{"id": "existing_123"}',
      check: (r, input) => {
        expect(r.generated).toEqual({})
        expect(r.result).toBe(input)
      },
    },
  ]

  it.each(cases)("$name", ({ input, check }) => check(replaceUuidPlaceholders(input), input))

  describe("normalization", () => {
    const cases = [
      {
        name: "lowercases and dasherizes",
        input: '{"id": "[uuid-callout-User Frustration]"}',
        expectedKey: "callout-user-frustration",
      },
      {
        name: "trims whitespace",
        input: '{"id": "[uuid-callout- spaced ]"}',
        expectedKey: "callout-spaced",
      },
      {
        name: "collapses multiple dashes",
        input: '{"id": "[uuid-callout--double--dash]"}',
        expectedKey: "callout-double-dash",
      },
      {
        name: "replaces underscores with dashes",
        input: '{"id": "[uuid-callout-some_name]"}',
        expectedKey: "callout-some-name",
      },
      {
        name: "same key for different casing",
        input: '{"a": "[uuid-callout-Theme A]", "b": "[uuid-callout-theme a]"}',
        expectedKey: "callout-theme-a",
        expectedCount: 1,
      },
    ]

    it.each(cases)("$name", ({ input, expectedKey, expectedCount }) => {
      const result = replaceUuidPlaceholders(input)
      expect(result.generated).toHaveProperty(expectedKey)
      if (expectedCount !== undefined) {
        expect(Object.keys(result.generated)).toHaveLength(expectedCount)
      }
    })
  })

  describe("persistent placeholder map", () => {
    it("returns same ID for same placeholder across calls", () => {
      const first = replaceUuidPlaceholders('{"id": "[uuid-callout]"}')
      const second = replaceUuidPlaceholders('{"id": "[uuid-callout]"}')

      expect(first.generated["callout"]).toBe(second.generated["callout"])
    })
  })
})
