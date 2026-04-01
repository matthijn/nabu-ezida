import { describe, it, expect } from "vitest"
import { projections, toJsonSchema } from "./projections"
import type { ProjectionConfig } from "~/lib/db/projection"

const findProjection = (language: string): ProjectionConfig => {
  const p = projections.find((p) => p.language === language)
  if (!p) throw new Error(`No projection for ${language}`)
  return p
}

describe("projections", () => {
  describe("table schemas", () => {
    interface Case {
      name: string
      language: string
      expectedTable: string
      expectTopLevelProperty: string
    }

    const cases: Case[] = [
      {
        name: "singleton plain object — schema has top-level properties",
        language: "json-attributes",
        expectedTable: "attributes",
        expectTopLevelProperty: "tags",
      },
      {
        name: "singleton with rowPath — schema is the array element, not the wrapper",
        language: "json-annotations",
        expectedTable: "annotations",
        expectTopLevelProperty: "text",
      },
      {
        name: "non-singleton — schema is the block itself",
        language: "json-callout",
        expectedTable: "callout",
        expectTopLevelProperty: "title",
      },
    ]

    it.each(cases)("$name", ({ language, expectedTable, expectTopLevelProperty }) => {
      const p = findProjection(language)
      expect(p.tableName).toBe(expectedTable)

      const jsonSchema = toJsonSchema(p)
      expect(jsonSchema.properties).toHaveProperty(expectTopLevelProperty)
    })

    it("annotations schema does not have wrapper 'annotations' key", () => {
      const p = findProjection("json-annotations")
      const jsonSchema = toJsonSchema(p)
      expect(jsonSchema.properties).not.toHaveProperty("annotations")
    })
  })

  describe("blockParser", () => {
    interface Case {
      name: string
      language: string
      markdown: string
      expectedRows: number
      expectRowField: { key: string; value: unknown }
    }

    const cases: Case[] = [
      {
        name: "singleton plain object — one row from one block",
        language: "json-attributes",
        markdown: '# Doc\n\n```json-attributes\n{"tags": ["a"]}\n```\n',
        expectedRows: 1,
        expectRowField: { key: "tags", value: ["a"] },
      },
      {
        name: "singleton with rowPath — fans out array elements as rows",
        language: "json-annotations",
        markdown:
          '# Doc\n\n```json-annotations\n{"annotations": [{"text": "hi", "reason": "r", "color": "blue"}, {"text": "bye", "reason": "s", "color": "red"}]}\n```\n',
        expectedRows: 2,
        expectRowField: { key: "text", value: "hi" },
      },
      {
        name: "singleton with rowPath — empty array yields no rows",
        language: "json-annotations",
        markdown: '# Doc\n\n```json-annotations\n{"annotations": []}\n```\n',
        expectedRows: 0,
        expectRowField: { key: "text", value: undefined },
      },
      {
        name: "non-singleton — one row per block",
        language: "json-callout",
        markdown: [
          "# Doc",
          "",
          "```json-callout",
          JSON.stringify({
            id: "c1",
            type: "codebook-code",
            title: "A",
            content: "x",
            color: "red",
            collapsed: false,
          }),
          "```",
          "",
          "```json-callout",
          JSON.stringify({
            id: "c2",
            type: "codebook-code",
            title: "B",
            content: "y",
            color: "blue",
            collapsed: false,
          }),
          "```",
          "",
        ].join("\n"),
        expectedRows: 2,
        expectRowField: { key: "title", value: "A" },
      },
    ]

    it.each(cases)("$name", ({ language, markdown, expectedRows, expectRowField }) => {
      const p = findProjection(language)
      const rows = p.blockParser(markdown)
      expect(rows).toHaveLength(expectedRows)

      if (expectedRows > 0) {
        expect((rows[0] as Record<string, unknown>)[expectRowField.key]).toEqual(
          expectRowField.value
        )
      }
    })
  })
})
