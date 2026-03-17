import { describe, it, expect, beforeEach } from "vitest"
import { fillMissingIds, replaceUuidPlaceholders, clearPersistentIds, isSystemId } from "./uuid"

beforeEach(() => {
  clearPersistentIds()
})

describe("isSystemId", () => {
  const cases = [
    { id: "callout-3k8m2n4p", prefix: "callout", expected: true, name: "valid callout ID" },
    { id: "annotation-7abc123d", prefix: "annotation", expected: true, name: "valid annotation ID" },
    { id: "code_fiscal-reporting", prefix: "callout", expected: false, name: "wrong prefix" },
    { id: "callout-my-custom-id", prefix: "callout", expected: false, name: "hyphens in suffix" },
    { id: "callout-abc", prefix: "callout", expected: false, name: "suffix too short" },
    { id: "callout-ABCDEFGH", prefix: "callout", expected: false, name: "uppercase in suffix" },
    { id: "", prefix: "callout", expected: false, name: "empty string" },
    { id: "tag-transcript", prefix: "tag", expected: false, name: "pure-alpha slug" },
    { id: "tag-codebook", prefix: "tag", expected: false, name: "pure-alpha word" },
    { id: "annotation-abcdefgh", prefix: "annotation", expected: false, name: "all letters no digits" },
  ]

  cases.forEach(({ id, prefix, expected, name }) => {
    it(name, () => {
      expect(isSystemId(id, prefix)).toBe(expected)
    })
  })
})

describe("fillMissingIds", () => {
  describe("root-level IDs (json-callout)", () => {
    it("fills missing id on callout block", () => {
      const input = `# Doc

\`\`\`json-callout
{
  "title": "My Callout"
}
\`\`\``

      const result = fillMissingIds(input)

      expect(result.generated).toHaveLength(1)
      expect(result.generated[0].type).toBe("json-callout")
      expect(result.generated[0].label).toBe("My Callout")
      expect(result.content).toContain(`"id": "${result.generated[0].id}"`)
    })

    it("preserves existing id on callout block", () => {
      const input = `# Doc

\`\`\`json-callout
{
  "id": "existing_123",
  "title": "My Callout"
}
\`\`\``

      const result = fillMissingIds(input)

      expect(result.generated).toHaveLength(0)
      expect(result.content).toBe(input)
    })
  })

  describe("nested IDs (json-attributes.annotations)", () => {
    it("fills missing id on annotations", () => {
      const input = `# Doc

\`\`\`json-attributes
{
  "annotations": [
    { "text": "hello", "reason": "test", "color": "blue" }
  ]
}
\`\`\``

      const result = fillMissingIds(input)

      expect(result.generated).toHaveLength(1)
      expect(result.generated[0].type).toBe("json-attributes.annotations")
      expect(result.generated[0].id).toMatch(/^annotation-/)
      expect(result.content).toContain(`"id": "${result.generated[0].id}"`)
    })

    it("fills multiple missing annotation ids", () => {
      const input = `# Doc

\`\`\`json-attributes
{
  "annotations": [
    { "text": "first", "reason": "a", "color": "blue" },
    { "text": "second", "reason": "b", "color": "red" }
  ]
}
\`\`\``

      const result = fillMissingIds(input)

      expect(result.generated).toHaveLength(2)
      expect(result.generated[0].id).toMatch(/^annotation-/)
      expect(result.generated[1].id).toMatch(/^annotation-/)
      expect(result.generated[0].id).not.toBe(result.generated[1].id)
    })

    it("preserves existing annotation ids", () => {
      const input = `# Doc

\`\`\`json-attributes
{
  "annotations": [
    { "id": "ann_existing", "text": "hello", "reason": "test", "color": "blue" }
  ]
}
\`\`\``

      const result = fillMissingIds(input)

      expect(result.generated).toHaveLength(0)
      expect(result.content).toBe(input)
    })

    it("fills only missing ids in mixed array", () => {
      const input = `# Doc

\`\`\`json-attributes
{
  "annotations": [
    { "id": "ann_existing", "text": "first", "reason": "a", "color": "blue" },
    { "text": "second", "reason": "b", "color": "red" }
  ]
}
\`\`\``

      const result = fillMissingIds(input)

      expect(result.generated).toHaveLength(1)
      expect(result.content).toContain("ann_existing")
      expect(result.content).toContain(result.generated[0].id)
    })
  })

  it("handles document with no json blocks", () => {
    const input = "# Just text\n\nNo blocks here."
    const result = fillMissingIds(input)

    expect(result.generated).toHaveLength(0)
    expect(result.content).toBe(input)
  })

  describe("malformed ID normalization", () => {
    const calloutBlock = (id: string) => `# Doc

\`\`\`json-callout
{
  "id": "${id}",
  "title": "Test"
}
\`\`\``

    const annotationBlock = (id: string) => `# Doc

\`\`\`json-attributes
{
  "annotations": [
    { "id": "${id}", "text": "hello", "reason": "test", "color": "blue" }
  ]
}
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

    cases.forEach(({ name, input, original, expectNormalized, expectedPrefix, expectedSource }) => {
      it(name, () => {
        const result = fillMissingIds(input, original)

        if (expectNormalized) {
          expect(result.generated).toHaveLength(1)
          expect(result.generated[0].id).toMatch(expectedPrefix!)
          expect(result.generated[0].source).toBe(expectedSource)
          expect(result.content).toContain(result.generated[0].id)
          expect(result.content).not.toContain(expectedSource)
        } else {
          expect(result.generated).toHaveLength(0)
          expect(result.content).toBe(input)
        }
      })
    })

    it("returns same normalized ID for same malformed ID across calls", () => {
      const first = fillMissingIds(calloutBlock("my-custom-id"), emptyOriginal)
      const second = fillMissingIds(calloutBlock("my-custom-id"), emptyOriginal)

      expect(first.generated[0].id).toBe(second.generated[0].id)
    })
  })
})

describe("replaceUuidPlaceholders", () => {
  it("replaces single placeholder", () => {
    const input = '{"id": "[uuid-callout-1]"}'
    const result = replaceUuidPlaceholders(input)

    expect(result.generated).toHaveProperty("callout-1")
    expect(result.result).toContain(result.generated["callout-1"])
    expect(result.result).not.toContain("[uuid-")
  })

  it("replaces same placeholder with same id", () => {
    const input = '{"id": "[uuid-ref-1]", "ref": "[uuid-ref-1]"}'
    const result = replaceUuidPlaceholders(input)

    expect(Object.keys(result.generated)).toHaveLength(1)
    const id = result.generated["ref-1"]
    expect(result.result).toBe(`{"id": "${id}", "ref": "${id}"}`)
  })

  it("replaces different placeholders with different ids", () => {
    const input = '{"a": "[uuid-first]", "b": "[uuid-second]"}'
    const result = replaceUuidPlaceholders(input)

    expect(Object.keys(result.generated)).toHaveLength(2)
    expect(result.generated["first"]).not.toBe(result.generated["second"])
  })

  it("leaves content without placeholders unchanged", () => {
    const input = '{"id": "existing_123"}'
    const result = replaceUuidPlaceholders(input)

    expect(result.generated).toEqual({})
    expect(result.result).toBe(input)
  })

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

    cases.forEach(({ name, input, expectedKey, expectedCount }) => {
      it(name, () => {
        const result = replaceUuidPlaceholders(input)
        expect(result.generated).toHaveProperty(expectedKey)
        if (expectedCount !== undefined) {
          expect(Object.keys(result.generated)).toHaveLength(expectedCount)
        }
      })
    })
  })

  describe("persistent placeholder map", () => {
    it("returns same ID for same placeholder across calls", () => {
      const first = replaceUuidPlaceholders('{"id": "[uuid-callout]"}')
      const second = replaceUuidPlaceholders('{"id": "[uuid-callout]"}')

      expect(first.generated["callout"]).toBe(second.generated["callout"])
    })

    it("returns different IDs after clear", () => {
      const first = replaceUuidPlaceholders('{"id": "[uuid-callout]"}')
      const firstId = first.generated["callout"]
      clearPersistentIds()
      const second = replaceUuidPlaceholders('{"id": "[uuid-callout]"}')

      expect(firstId).toBeDefined()
      expect(second.generated["callout"]).toBeDefined()
      expect(firstId).not.toBe(second.generated["callout"])
    })
  })
})
