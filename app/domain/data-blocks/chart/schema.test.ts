import { describe, it, expect } from "vitest"
import { ChartSchema, parseChart } from "./schema"

const baseChart = (spec: unknown) => ({
  id: "chart-001",
  caption: { label: "Demo" },
  query: "SELECT * FROM t",
  spec,
})

describe("ChartSchema — valid specs", () => {
  const cases: {
    name: string
    spec: Record<string, unknown>
  }[] = [
    {
      name: "bar with string bindings and radix color",
      spec: { type: "bar", x: "code", y: "count", color: "blue" },
    },
    {
      name: "stacked-bar with series and entity color template",
      spec: {
        type: "stacked-bar",
        x: "month",
        y: "value",
        series: "category",
        color: "{category:color}",
      },
    },
    {
      name: "grouped-bar with object bindings and format",
      spec: {
        type: "grouped-bar",
        x: { field: "category", label: "Category" },
        y: { field: "amount", label: "Amount", format: ",.0f" },
        color: "green",
      },
    },
    {
      name: "line with orientation vertical and tooltip",
      spec: {
        type: "line",
        x: "date",
        y: "value",
        orientation: "vertical",
        color: "purple",
        tooltip: "{value:,.0f} on {date:%b %Y}",
      },
    },
    {
      name: "area with column template color",
      spec: { type: "area", x: "t", y: "v", color: "{color}" },
    },
    {
      name: "scatter minimal",
      spec: { type: "scatter", x: "x", y: "y", color: "orange" },
    },
    {
      name: "pie with label/value + radix",
      spec: { type: "pie", label: "name", value: "amount", color: "pink" },
    },
    {
      name: "treemap with parent",
      spec: {
        type: "treemap",
        label: "name",
        value: "amount",
        parent: "group",
        color: "cyan",
      },
    },
    {
      name: "heatmap with x/y/value",
      spec: {
        type: "heatmap",
        x: "day",
        y: "hour",
        value: "count",
        color: "teal",
      },
    },
  ]

  cases.forEach(({ name, spec }) => {
    it(name, () => {
      const result = ChartSchema.safeParse(baseChart(spec))
      expect(result.success).toBe(true)
    })
  })
})

describe("ChartSchema — color forms", () => {
  const cases: {
    name: string
    color: string
    valid: boolean
  }[] = [
    { name: "radix token", color: "blue", valid: true },
    { name: "radix token (gray)", color: "gray", valid: true },
    { name: "column template raw", color: "{color_col}", valid: true },
    { name: "entity property template", color: "{code:color}", valid: true },
    { name: "unknown radix-like literal", color: "fuchsia", valid: false },
    { name: "hex literal", color: "#3b82f6", valid: false },
    { name: "empty string", color: "", valid: false },
    { name: "arbitrary string", color: "rainbow", valid: false },
  ]

  cases.forEach(({ name, color, valid }) => {
    it(name, () => {
      const result = ChartSchema.safeParse(baseChart({ type: "bar", x: "a", y: "b", color }))
      expect(result.success).toBe(valid)
    })
  })
})

describe("ChartSchema — invalid", () => {
  const cases: {
    name: string
    payload: unknown
  }[] = [
    {
      name: "missing id",
      payload: {
        caption: { label: "x" },
        query: "SELECT 1",
        spec: { type: "bar", x: "a", y: "b", color: "blue" },
      },
    },
    {
      name: "missing caption.label",
      payload: {
        id: "chart-1",
        caption: {},
        query: "SELECT 1",
        spec: { type: "bar", x: "a", y: "b", color: "blue" },
      },
    },
    {
      name: "SEMANTIC() in query",
      payload: {
        id: "chart-1",
        caption: { label: "x" },
        query: "SELECT SEMANTIC('foo')",
        spec: { type: "bar", x: "a", y: "b", color: "blue" },
      },
    },
    {
      name: "unknown chart type",
      payload: baseChart({ type: "lollipop", x: "a", y: "b", color: "blue" }),
    },
    {
      name: "bar missing y",
      payload: baseChart({ type: "bar", x: "a", color: "blue" }),
    },
    {
      name: "pie missing value",
      payload: baseChart({ type: "pie", label: "n", color: "blue" }),
    },
    {
      name: "heatmap missing value",
      payload: baseChart({ type: "heatmap", x: "d", y: "h", color: "blue" }),
    },
    {
      name: "field binding with empty field name",
      payload: baseChart({
        type: "bar",
        x: { field: "" },
        y: "y",
        color: "blue",
      }),
    },
    {
      name: "invalid orientation",
      payload: baseChart({
        type: "bar",
        x: "a",
        y: "b",
        orientation: "diagonal",
        color: "blue",
      }),
    },
  ]

  cases.forEach(({ name, payload }) => {
    it(name, () => {
      const result = ChartSchema.safeParse(payload)
      expect(result.success).toBe(false)
    })
  })
})

describe("parseChart", () => {
  it("returns parsed block on valid JSON", () => {
    const json = JSON.stringify(baseChart({ type: "bar", x: "a", y: "b", color: "blue" }))
    const result = parseChart(json)
    expect(result).not.toBeNull()
    expect(result?.spec.type).toBe("bar")
  })

  it("returns null on invalid JSON", () => {
    expect(parseChart("not json")).toBeNull()
  })

  it("returns null on schema violation", () => {
    const json = JSON.stringify(baseChart({ type: "bogus" }))
    expect(parseChart(json)).toBeNull()
  })
})
