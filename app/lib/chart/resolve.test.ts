import { describe, it, expect } from "vitest"
import { resolveChartData, type ResolveOptions } from "./resolve"
import type {
  AxisRenderable,
  ChartEntityMap,
  ChartSpec,
  PartRenderable,
  RenderableChart,
} from "./types"
import { entity, buildColorContext } from "./test-helpers"

const buildOptions = (
  spec: ChartSpec,
  rows: Record<string, unknown>[],
  entityMap: ChartEntityMap = {}
): ResolveOptions => ({
  spec,
  rows,
  entityMap,
  colorContext: buildColorContext(entityMap),
})

const asAxis = (chart: RenderableChart): AxisRenderable => {
  if (chart.kind !== "axis") throw new Error(`expected axis, got ${chart.kind}`)
  return chart
}

const asPart = (chart: RenderableChart): PartRenderable => {
  if (chart.kind !== "part") throw new Error(`expected part, got ${chart.kind}`)
  return chart
}

const mustFind = <T>(arr: T[], pred: (item: T) => boolean, label: string): T => {
  const found = arr.find(pred)
  if (!found) throw new Error(`expected ${label}`)
  return found
}

describe("resolveChartData — axis charts", () => {
  const cases: {
    name: string
    spec: ChartSpec
    rows: Record<string, unknown>[]
    entityMap?: ChartEntityMap
    expect: (chart: AxisRenderable) => void
  }[] = [
    {
      name: "bar: groups by x, sums y, resolves radix color",
      spec: {
        type: "bar",
        x: "code",
        y: "count",
        color: "blue",
      },
      rows: [
        { code: "alpha", count: 3 },
        { code: "alpha", count: 2 },
        { code: "beta", count: 5 },
      ],
      expect: (chart) => {
        expect(chart.type).toBe("bar")
        expect(chart.orientation).toBe("horizontal")
        expect(chart.seriesNames).toEqual(["count"])
        expect(chart.seriesColors).toEqual({ count: "radix(blue,9)" })
        expect(chart.rows).toHaveLength(2)
        expect(chart.rows[0].x).toBe("alpha")
        expect(chart.rows[0].count).toBe(5)
        expect(chart.rows[0]._colors).toEqual({ count: "radix(blue,9)" })
        expect(chart.rows[1].x).toBe("beta")
        expect(chart.rows[1].count).toBe(5)
      },
    },
    {
      name: "stacked-bar: series with entity label + per-row color from entity",
      spec: {
        type: "stacked-bar",
        x: "month",
        y: "value",
        series: "code",
        color: "{code:color}",
      },
      rows: [
        { month: "Jan", code: "callout-abc12345", value: 10 },
        { month: "Jan", code: "callout-def67890", value: 5 },
        { month: "Feb", code: "callout-abc12345", value: 7 },
      ],
      entityMap: {
        "callout-abc12345": entity("callout-abc12345", "Trust", "red"),
        "callout-def67890": entity("callout-def67890", "Fear", "#112233"),
      },
      expect: (chart) => {
        expect(chart.type).toBe("stacked-bar")
        expect(chart.seriesNames).toEqual(["Trust", "Fear"])
        expect(chart.seriesColors).toEqual({
          Trust: "radix(red,9)",
          Fear: "#112233",
        })
        expect(chart.rows).toHaveLength(2)
        const jan = mustFind(chart.rows, (r) => r.x === "Jan", "Jan row")
        expect(jan.Trust).toBe(10)
        expect(jan.Fear).toBe(5)
        expect(jan._colors).toEqual({ Trust: "radix(red,9)", Fear: "#112233" })
        const feb = mustFind(chart.rows, (r) => r.x === "Feb", "Feb row")
        expect(feb.Trust).toBe(7)
      },
    },
    {
      name: "grouped-bar: labels from binding object propagate to format + default series name",
      spec: {
        type: "grouped-bar",
        x: { field: "category", label: "Category" },
        y: { field: "amount", label: "Amount", format: ",.0f" },
        color: "green",
      },
      rows: [
        { category: "A", amount: 100 },
        { category: "B", amount: 200 },
      ],
      expect: (chart) => {
        expect(chart.type).toBe("grouped-bar")
        expect(chart.yFormat).toBe(",.0f")
        expect(chart.seriesNames).toEqual(["Amount"])
        expect(chart.rows[0].Amount).toBe(100)
      },
    },
    {
      name: "line: numeric x keys preserve type",
      spec: {
        type: "line",
        x: "year",
        y: "value",
        color: "purple",
      },
      rows: [
        { year: 2020, value: 10 },
        { year: 2021, value: 20 },
      ],
      expect: (chart) => {
        expect(chart.type).toBe("line")
        expect(chart.rows[0].x).toBe(2020)
        expect(chart.rows[1].x).toBe(2021)
        expect(chart.rows[0].value).toBe(10)
      },
    },
    {
      name: "area: literal hex color passes through",
      spec: {
        type: "area",
        x: "t",
        y: "v",
        color: "#ff00ff",
      },
      rows: [{ t: "a", v: 1 }],
      expect: (chart) => {
        expect(chart.type).toBe("area")
        expect(chart.seriesColors).toEqual({ v: "#ff00ff" })
        expect(chart.rows[0]._colors).toEqual({ v: "#ff00ff" })
      },
    },
    {
      name: "scatter: orientation vertical respected; tooltip parsed",
      spec: {
        type: "scatter",
        x: "x",
        y: "y",
        orientation: "vertical",
        color: "orange",
        tooltip: "{x}: {y:,.0f}",
      },
      rows: [{ x: 1, y: 1000 }],
      expect: (chart) => {
        expect(chart.type).toBe("scatter")
        expect(chart.orientation).toBe("vertical")
        expect(chart.rows[0]._tooltipNodes).toBeDefined()
        expect(chart.rows[0]._tooltipNodes?.length ?? 0).toBeGreaterThan(0)
      },
    },
    {
      name: "bar: entity URL propagated from chart entity map",
      spec: {
        type: "bar",
        x: "code",
        y: "count",
        color: "blue",
      },
      rows: [{ code: "callout-abc12345", count: 1 }],
      entityMap: {
        "callout-abc12345": entity("callout-abc12345", "Trust", "red"),
      },
      expect: (chart) => {
        expect(chart.rows[0]._entityUrl).toBe("/callout-abc12345")
      },
    },
    {
      name: "bar: unknown radix-looking value → fallback gray",
      spec: {
        type: "bar",
        x: "code",
        y: "count",
        color: "{code}",
      },
      rows: [{ code: "not-a-color", count: 1 }],
      expect: (chart) => {
        expect(chart.rows[0]._colors).toEqual({ count: "#888888" })
        expect(chart.seriesColors).toEqual({ count: "#888888" })
      },
    },
  ]

  it.each(cases)("$name", ({ spec, rows, entityMap, expect: assertFn }) => {
    const chart = resolveChartData(buildOptions(spec, rows, entityMap))
    assertFn(asAxis(chart))
  })
})

describe("resolveChartData — part charts", () => {
  const cases: {
    name: string
    spec: ChartSpec
    rows: Record<string, unknown>[]
    entityMap?: ChartEntityMap
    expect: (chart: PartRenderable) => void
  }[] = [
    {
      name: "pie: label resolved via entity map, color via property",
      spec: {
        type: "pie",
        label: "code",
        value: "count",
        color: "{code:color}",
      },
      rows: [
        { code: "callout-abc12345", count: 40 },
        { code: "callout-def67890", count: 60 },
      ],
      entityMap: {
        "callout-abc12345": entity("callout-abc12345", "Trust", "red"),
        "callout-def67890": entity("callout-def67890", "Fear", "blue"),
      },
      expect: (chart) => {
        expect(chart.type).toBe("pie")
        expect(chart.rows).toHaveLength(2)
        expect(chart.rows[0].name).toBe("Trust")
        expect(chart.rows[0].value).toBe(40)
        expect(chart.rows[0].fill).toBe("radix(red,9)")
        expect(chart.rows[1].name).toBe("Fear")
        expect(chart.rows[1].fill).toBe("radix(blue,9)")
      },
    },
    {
      name: "treemap: parent field resolved and values coerced",
      spec: {
        type: "treemap",
        label: "name",
        value: "amount",
        parent: "group",
        color: "cyan",
      },
      rows: [
        { name: "A", amount: "100", group: "G1" },
        { name: "B", amount: 200, group: "G1" },
      ],
      expect: (chart) => {
        expect(chart.type).toBe("treemap")
        expect(chart.rows[0]._parent).toBe("G1")
        expect(chart.rows[0].value).toBe(100)
        expect(chart.rows[1].value).toBe(200)
        expect(chart.rows[0].fill).toBe("radix(cyan,9)")
      },
    },
    {
      name: "pie: entity URL propagated from chart entity map",
      spec: {
        type: "pie",
        label: "code",
        value: "count",
        color: "pink",
      },
      rows: [{ code: "callout-abc12345", count: 5 }],
      entityMap: {
        "callout-abc12345": entity("callout-abc12345", "Trust", "red"),
      },
      expect: (chart) => {
        expect(chart.rows[0]._entityUrl).toBe("/callout-abc12345")
      },
    },
  ]

  it.each(cases)("$name", ({ spec, rows, entityMap, expect: assertFn }) => {
    const chart = resolveChartData(buildOptions(spec, rows, entityMap))
    assertFn(asPart(chart))
  })
})

describe("resolveChartData — heatmap", () => {
  it("returns matrix placeholder regardless of rows", () => {
    const chart = resolveChartData(
      buildOptions(
        {
          type: "heatmap",
          x: "day",
          y: "hour",
          value: "count",
          color: "blue",
        },
        [
          { day: "Mon", hour: 9, count: 3 },
          { day: "Tue", hour: 10, count: 5 },
        ]
      )
    )
    expect(chart.kind).toBe("matrix")
    expect(chart.type).toBe("heatmap")
  })
})
