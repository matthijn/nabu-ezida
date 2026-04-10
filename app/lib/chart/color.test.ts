import { describe, it, expect } from "vitest"
import { resolveChartColor, resolveRowColor, type ColorContext } from "./color"
import { parseTemplate } from "./template"
import type { ChartEntityMap } from "./types"

const entity = (id: string, color: string): ChartEntityMap[string] => ({
  id,
  label: id,
  url: `/${id}`,
  color,
})

const stubResolveRadix = (token: string, shade: number): string => `radix(${token},${shade})`

const buildContext = (entityMap: ChartEntityMap = {}): ColorContext => ({
  entityMap,
  resolveRadix: stubResolveRadix,
  shade: 9,
  fallback: "#888888",
})

describe("resolveChartColor", () => {
  const entityMap: ChartEntityMap = {
    "callout-abc12345": entity("callout-abc12345", "red"),
    "callout-def67890": entity("callout-def67890", "#112233"),
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
      context: buildContext(),
      expected: "#3b82f6",
    },
    {
      name: "radix token resolved via injected fn",
      value: "blue",
      context: buildContext(),
      expected: "radix(blue,9)",
    },
    {
      name: "entity id resolves to its color",
      value: "callout-abc12345",
      context: buildContext(entityMap),
      expected: "radix(red,9)",
    },
    {
      name: "entity id with hex color",
      value: "callout-def67890",
      context: buildContext(entityMap),
      expected: "#112233",
    },
    {
      name: "unknown value → fallback",
      value: "not-a-color",
      context: buildContext(),
      expected: "#888888",
    },
    {
      name: "empty value → fallback",
      value: "",
      context: buildContext(),
      expected: "#888888",
    },
  ]

  cases.forEach(({ name, value, context, expected }) => {
    it(name, () => {
      expect(resolveChartColor(value, context)).toBe(expected)
    })
  })
})

describe("resolveRowColor", () => {
  const entityMap: ChartEntityMap = {
    "callout-abc12345": entity("callout-abc12345", "red"),
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
      context: buildContext(),
      expected: "radix(blue,9)",
    },
    {
      name: "literal hex",
      template: "#ff0000",
      row: {},
      context: buildContext(),
      expected: "#ff0000",
    },
    {
      name: "column reference to radix name",
      template: "{color}",
      row: { color: "green" },
      context: buildContext(),
      expected: "radix(green,9)",
    },
    {
      name: "column reference to hex",
      template: "{color}",
      row: { color: "#abcdef" },
      context: buildContext(),
      expected: "#abcdef",
    },
    {
      name: "entity property color",
      template: "{code:color}",
      row: { code: "callout-abc12345" },
      context: buildContext(entityMap),
      expected: "radix(red,9)",
    },
    {
      name: "entity property on unknown id → fallback",
      template: "{code:color}",
      row: { code: "missing" },
      context: buildContext(entityMap),
      expected: "#888888",
    },
    {
      name: "missing column → fallback",
      template: "{color}",
      row: {},
      context: buildContext(),
      expected: "#888888",
    },
  ]

  cases.forEach(({ name, template, row, context, expected }) => {
    it(name, () => {
      const nodes = parseTemplate(template)
      expect(resolveRowColor(nodes, row, context)).toBe(expected)
    })
  })

  it("panics on multi-node color template", () => {
    const nodes = parseTemplate("{a}-{b}")
    expect(() => resolveRowColor(nodes, { a: "blue", b: "red" }, buildContext())).toThrow(
      /single node/
    )
  })
})
