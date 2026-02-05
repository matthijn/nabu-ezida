import { describe, it, expect } from "vitest"
import { fillMissingIds, replaceUuidPlaceholders } from "./uuid"

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
      expect(result.generated[0].id).toMatch(/^annotation_/)
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
      expect(result.generated[0].id).toMatch(/^annotation_/)
      expect(result.generated[1].id).toMatch(/^annotation_/)
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
})
