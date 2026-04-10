import { describe, expect, it } from "vitest"
import { toStrictSchema } from "./tool"

describe("toStrictSchema", () => {
  const cases = [
    {
      name: "passes through primitives",
      input: { type: "string", description: "a name" },
      expected: { type: "string", description: "a name" },
    },
    {
      name: "strips $schema",
      input: { $schema: "https://json-schema.org/draft/2020-12/schema", type: "string" },
      expected: { type: "string" },
    },
    {
      name: "makes optional properties required with null union",
      input: {
        type: "object",
        properties: {
          name: { type: "string" },
          age: { type: "number" },
        },
        required: ["name"],
        additionalProperties: false,
      },
      expected: {
        type: "object",
        properties: {
          name: { type: "string" },
          age: { anyOf: [{ type: "number" }, { type: "null" }] },
        },
        required: ["name", "age"],
        additionalProperties: false,
      },
    },
    {
      name: "recurses into array items",
      input: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            label: { type: "string" },
          },
          required: ["label"],
          additionalProperties: false,
        },
      },
      expected: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { anyOf: [{ type: "string" }, { type: "null" }] },
            label: { type: "string" },
          },
          required: ["id", "label"],
          additionalProperties: false,
        },
      },
    },
    {
      name: "recurses into nested objects",
      input: {
        type: "object",
        properties: {
          meta: {
            type: "object",
            properties: {
              tag: { type: "string" },
              opt: { type: "number" },
            },
            required: ["tag"],
            additionalProperties: false,
          },
        },
        required: ["meta"],
        additionalProperties: false,
      },
      expected: {
        type: "object",
        properties: {
          meta: {
            type: "object",
            properties: {
              tag: { type: "string" },
              opt: { anyOf: [{ type: "number" }, { type: "null" }] },
            },
            required: ["tag", "opt"],
            additionalProperties: false,
          },
        },
        required: ["meta"],
        additionalProperties: false,
      },
    },
    {
      name: "adds additionalProperties false when missing",
      input: {
        type: "object",
        properties: { a: { type: "string" } },
        required: ["a"],
      },
      expected: {
        type: "object",
        properties: { a: { type: "string" } },
        required: ["a"],
        additionalProperties: false,
      },
    },
    {
      name: "handles object with no required array",
      input: {
        type: "object",
        properties: { x: { type: "boolean" } },
        additionalProperties: false,
      },
      expected: {
        type: "object",
        properties: { x: { anyOf: [{ type: "boolean" }, { type: "null" }] } },
        required: ["x"],
        additionalProperties: false,
      },
    },
  ]

  it.each(cases)("$name", ({ input, expected }) => {
    expect(toStrictSchema(input)).toEqual(expected)
  })
})
