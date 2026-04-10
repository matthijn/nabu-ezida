import { describe, it, expect } from "vitest"
import {
  parseTemplate,
  resolveTemplateToMarkdown,
  isTemplate,
  collectReferencedFields,
} from "./template"
import type { ChartEntityMap, ChartSpec, TemplateNode } from "./types"

const entity = (id: string, label: string, color: string): ChartEntityMap[string] => ({
  id,
  label,
  url: `/${id}`,
  color,
})

describe("parseTemplate", () => {
  const cases: {
    name: string
    input: string
    expected: TemplateNode[]
  }[] = [
    {
      name: "empty string",
      input: "",
      expected: [],
    },
    {
      name: "literal only",
      input: "Hello world",
      expected: [{ type: "literal", value: "Hello world" }],
    },
    {
      name: "single raw ref",
      input: "{count}",
      expected: [{ type: "ref", field: "count", op: { kind: "raw" } }],
    },
    {
      name: "ref with format",
      input: "{count:.2f}",
      expected: [{ type: "ref", field: "count", op: { kind: "format", format: ".2f" } }],
    },
    {
      name: "ref with property color",
      input: "{code:color}",
      expected: [{ type: "ref", field: "code", op: { kind: "property", property: "color" } }],
    },
    {
      name: "ref with property label",
      input: "{code:label}",
      expected: [{ type: "ref", field: "code", op: { kind: "property", property: "label" } }],
    },
    {
      name: "literal and refs mixed",
      input: "total: {count} items",
      expected: [
        { type: "literal", value: "total: " },
        { type: "ref", field: "count", op: { kind: "raw" } },
        { type: "literal", value: " items" },
      ],
    },
    {
      name: "time format",
      input: "{date:%b %Y}",
      expected: [{ type: "ref", field: "date", op: { kind: "format", format: "%b %Y" } }],
    },
    {
      name: "percentage format",
      input: "{pct:.0%}",
      expected: [{ type: "ref", field: "pct", op: { kind: "format", format: ".0%" } }],
    },
  ]

  cases.forEach(({ name, input, expected }) => {
    it(name, () => {
      expect(parseTemplate(input)).toEqual(expected)
    })
  })
})

describe("resolveTemplateToMarkdown", () => {
  const entityMap: ChartEntityMap = {
    "callout-abc12345": entity("callout-abc12345", "Trust", "red"),
  }

  const cases: {
    name: string
    input: string
    row: Record<string, unknown>
    map: ChartEntityMap
    expected: string
  }[] = [
    {
      name: "raw entity id becomes markdown link",
      input: "{code}",
      row: { code: "callout-abc12345" },
      map: entityMap,
      expected: "[Trust](file://callout-abc12345)",
    },
    {
      name: "raw non-entity string unchanged",
      input: "{code}",
      row: { code: "alpha" },
      map: entityMap,
      expected: "alpha",
    },
    {
      name: "property access returns scalar color",
      input: "{code:color}",
      row: { code: "callout-abc12345" },
      map: entityMap,
      expected: "red",
    },
    {
      name: "property name returns label",
      input: "{code:name}",
      row: { code: "callout-abc12345" },
      map: entityMap,
      expected: "Trust",
    },
    {
      name: "format applies to numbers",
      input: "{n:,}",
      row: { n: 12345 },
      map: {},
      expected: "12,345",
    },
    {
      name: "format percentage",
      input: "{pct:.0%}",
      row: { pct: 0.345 },
      map: {},
      expected: "35%",
    },
    {
      name: "literal + entity link mixed",
      input: "Hovered: {code}",
      row: { code: "callout-abc12345" },
      map: entityMap,
      expected: "Hovered: [Trust](file://callout-abc12345)",
    },
    {
      name: "null value",
      input: "{count}",
      row: { count: null },
      map: {},
      expected: "",
    },
    {
      name: "missing field",
      input: "{missing}",
      row: {},
      map: {},
      expected: "",
    },
  ]

  cases.forEach(({ name, input, row, map, expected }) => {
    it(name, () => {
      const nodes = parseTemplate(input)
      expect(resolveTemplateToMarkdown(nodes, { row, entityMap: map })).toBe(expected)
    })
  })
})

describe("isTemplate", () => {
  const cases: { input: string; expected: boolean }[] = [
    { input: "{count}", expected: true },
    { input: "blue", expected: false },
    { input: "{code:color}", expected: true },
    { input: "", expected: false },
    { input: "literal text", expected: false },
    { input: "open { only", expected: false },
  ]

  cases.forEach(({ input, expected }) => {
    it(`"${input}" → ${expected}`, () => {
      expect(isTemplate(input)).toBe(expected)
    })
  })
})

describe("collectReferencedFields", () => {
  const cases: {
    name: string
    spec: ChartSpec
    expected: string[]
  }[] = [
    {
      name: "bar with string bindings",
      spec: {
        type: "bar",
        x: "code",
        y: "count",
        color: "blue",
      },
      expected: ["code", "count"],
    },
    {
      name: "bar with series and color template",
      spec: {
        type: "bar",
        x: "month",
        y: "value",
        series: "category",
        color: "{category:color}",
      },
      expected: ["month", "value", "category"],
    },
    {
      name: "bar with object bindings",
      spec: {
        type: "bar",
        x: { field: "date", label: "Date", format: "%b %Y" },
        y: { field: "count", label: "Count" },
        color: "blue",
      },
      expected: ["date", "count"],
    },
    {
      name: "pie with parent",
      spec: {
        type: "pie",
        label: "name",
        value: "amount",
        parent: "group",
        color: "blue",
      },
      expected: ["name", "amount", "group"],
    },
    {
      name: "heatmap",
      spec: {
        type: "heatmap",
        x: "day",
        y: "hour",
        value: "count",
        color: "blue",
      },
      expected: ["day", "hour", "count"],
    },
    {
      name: "tooltip contributes fields",
      spec: {
        type: "line",
        x: "date",
        y: "value",
        color: "blue",
        tooltip: "{label}: {value} ({pct:.0%})",
      },
      expected: ["date", "value", "label", "pct"],
    },
  ]

  cases.forEach(({ name, spec, expected }) => {
    it(name, () => {
      expect(collectReferencedFields(spec).sort()).toEqual(expected.sort())
    })
  })
})
