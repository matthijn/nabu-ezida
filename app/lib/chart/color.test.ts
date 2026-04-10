import { describe, it, expect } from "vitest"
import { resolveChartColor, resolveRowColor, type ColorContext } from "./color"
import { parseTemplate } from "./template"
import type { ChartEntityMap } from "./types"
import { entity, buildColorContext } from "./test-helpers"

describe("resolveChartColor", () => {
  const entityMap: ChartEntityMap = {
    "callout-abc12345": entity("callout-abc12345", "callout-abc12345", "red"),
    "callout-def67890": entity("callout-def67890", "callout-def67890", "#112233"),
  }

  const cases: {
    name: string
    value: string
    context: ColorContext
    expected: string
  }[] = [
    {
      name: "hex passes through",
      value: "#3b82f6",
      context: buildColorContext(),
      expected: "#3b82f6",
    },
    {
      name: "radix token resolved via injected fn",
      value: "blue",
      context: buildColorContext(),
      expected: "radix(blue,9)",
    },
    {
      name: "entity id resolves to its color",
      value: "callout-abc12345",
      context: buildColorContext(entityMap),
      expected: "radix(red,9)",
    },
    {
      name: "entity id with hex color",
      value: "callout-def67890",
      context: buildColorContext(entityMap),
      expected: "#112233",
    },
    {
      name: "unknown value → fallback",
      value: "not-a-color",
      context: buildColorContext(),
      expected: "#888888",
    },
    {
      name: "empty value → fallback",
      value: "",
      context: buildColorContext(),
      expected: "#888888",
    },
  ]

  it.each(cases)("$name", ({ value, context, expected }) => {
    expect(resolveChartColor(value, context)).toBe(expected)
  })
})

describe("resolveRowColor", () => {
  const entityMap: ChartEntityMap = {
    "callout-abc12345": entity("callout-abc12345", "callout-abc12345", "red"),
  }

  const cases: {
    name: string
    template: string
    row: Record<string, unknown>
    context: ColorContext
    expected: string
  }[] = [
    {
      name: "literal radix token",
      template: "blue",
      row: {},
      context: buildColorContext(),
      expected: "radix(blue,9)",
    },
    {
      name: "literal hex",
      template: "#ff0000",
      row: {},
      context: buildColorContext(),
      expected: "#ff0000",
    },
    {
      name: "column reference to radix name",
      template: "{color}",
      row: { color: "green" },
      context: buildColorContext(),
      expected: "radix(green,9)",
    },
    {
      name: "column reference to hex",
      template: "{color}",
      row: { color: "#abcdef" },
      context: buildColorContext(),
      expected: "#abcdef",
    },
    {
      name: "entity property color",
      template: "{code:color}",
      row: { code: "callout-abc12345" },
      context: buildColorContext(entityMap),
      expected: "radix(red,9)",
    },
    {
      name: "entity property on unknown id → fallback",
      template: "{code:color}",
      row: { code: "missing" },
      context: buildColorContext(entityMap),
      expected: "#888888",
    },
    {
      name: "missing column → fallback",
      template: "{color}",
      row: {},
      context: buildColorContext(),
      expected: "#888888",
    },
  ]

  it.each(cases)("$name", ({ template, row, context, expected }) => {
    const nodes = parseTemplate(template)
    expect(resolveRowColor(nodes, row, context)).toBe(expected)
  })

  it("panics on multi-node color template", () => {
    const nodes = parseTemplate("{a}-{b}")
    expect(() => resolveRowColor(nodes, { a: "blue", b: "red" }, buildColorContext())).toThrow(
      /single node/
    )
  })
})
