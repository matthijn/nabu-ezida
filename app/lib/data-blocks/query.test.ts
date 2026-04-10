import { describe, it, expect } from "vitest"
import { z } from "zod"
import { recoverArrayItems, getBlock } from "./query"

const ItemSchema = z.object({
  id: z.string(),
  value: z.enum(["a", "b", "c"]),
})

const BlockSchema = z.object({
  items: z.array(ItemSchema),
  label: z.string().optional(),
})

type Block = z.infer<typeof BlockSchema>

const TwoArraysSchema = z.object({
  tags: z.array(ItemSchema).optional(),
  notes: z.array(z.object({ text: z.string() })).optional(),
})

describe("recoverArrayItems", () => {
  const cases: {
    name: string
    json: Record<string, unknown>
    schema: z.ZodType
    check: (result: unknown) => void
  }[] = [
    {
      name: "returns null when no array fields exist",
      json: { label: "test" },
      schema: BlockSchema,
      check: (result) => {
        expect(result).toBeNull()
      },
    },
    {
      name: "returns null when base object is invalid",
      json: { items: [{ id: "1", value: "a" }], label: 42 },
      schema: BlockSchema,
      check: (result) => {
        expect(result).toBeNull()
      },
    },
    {
      name: "filters out invalid items and keeps valid ones",
      json: {
        items: [
          { id: "1", value: "a" },
          { id: "2", value: "INVALID" },
          { id: "3", value: "b" },
        ],
      },
      schema: BlockSchema,
      check: (result) => {
        const block = result as Block
        expect(block.items).toEqual([
          { id: "1", value: "a" },
          { id: "3", value: "b" },
        ])
      },
    },
    {
      name: "returns empty array when all items are invalid",
      json: {
        items: [
          { id: "1", value: "INVALID" },
          { id: "2", value: "ALSO_BAD" },
        ],
      },
      schema: BlockSchema,
      check: (result) => {
        const block = result as Block
        expect(block.items).toEqual([])
      },
    },
    {
      name: "returns null when all items are valid (nothing to recover)",
      json: {
        items: [
          { id: "1", value: "a" },
          { id: "2", value: "b" },
        ],
      },
      schema: BlockSchema,
      check: (result) => {
        expect(result).toBeNull()
      },
    },
    {
      name: "recovers across multiple array fields independently",
      json: {
        tags: [
          { id: "1", value: "a" },
          { id: "2", value: "BAD" },
        ],
        notes: [{ text: "ok" }, { wrong: "field" }],
      },
      schema: TwoArraysSchema,
      check: (result) => {
        const block = result as z.infer<typeof TwoArraysSchema>
        expect(block.tags).toEqual([{ id: "1", value: "a" }])
        expect(block.notes).toEqual([{ text: "ok" }])
      },
    },
    {
      name: "preserves non-array fields",
      json: {
        items: [
          { id: "1", value: "a" },
          { id: "2", value: "BAD" },
        ],
        label: "my block",
      },
      schema: BlockSchema,
      check: (result) => {
        const block = result as Block
        expect(block.label).toBe("my block")
        expect(block.items).toHaveLength(1)
      },
    },
  ]

  it.each(cases)("$name", ({ json, schema, check }) => {
    check(recoverArrayItems(json, schema))
  })
})

describe("getBlock with recovery", () => {
  const TestSchema = z.object({
    tags: z.array(z.object({ id: z.string(), color: z.enum(["red", "blue"]) })),
  })

  const cases: {
    name: string
    markdown: string
    check: (result: z.infer<typeof TestSchema> | null) => void
  }[] = [
    {
      name: "parses valid block normally",
      markdown: [
        "# Doc",
        "",
        "```json-test",
        JSON.stringify({
          tags: [
            { id: "1", color: "red" },
            { id: "2", color: "blue" },
          ],
        }),
        "```",
      ].join("\n"),
      check: (result) => {
        if (!result) throw new Error("expected non-null")
        expect(result.tags).toHaveLength(2)
      },
    },
    {
      name: "recovers valid items when some are invalid",
      markdown: [
        "# Doc",
        "",
        "```json-test",
        JSON.stringify({
          tags: [
            { id: "1", color: "red" },
            { id: "2", color: "INVALID" },
            { id: "3", color: "blue" },
          ],
        }),
        "```",
      ].join("\n"),
      check: (result) => {
        if (!result) throw new Error("expected non-null")
        expect(result.tags).toEqual([
          { id: "1", color: "red" },
          { id: "3", color: "blue" },
        ])
      },
    },
    {
      name: "returns null for invalid JSON",
      markdown: "# Doc\n\n```json-test\nnot json\n```",
      check: (result) => {
        expect(result).toBeNull()
      },
    },
    {
      name: "returns null when block is missing",
      markdown: "# Doc\n\nno block here",
      check: (result) => {
        expect(result).toBeNull()
      },
    },
  ]

  it.each(cases)("$name", ({ markdown, check }) => {
    check(getBlock(markdown, "json-test", TestSchema))
  })
})
