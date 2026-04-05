import { describe, it, expect } from "vitest"
import { buildChartOption, type ChartColorMap } from "./options"

describe("buildChartOption", () => {
  const cases: {
    name: string
    specOptions: Record<string, unknown>
    rows: Record<string, unknown>[]
    colorMap: ChartColorMap
    check: (result: Record<string, unknown>) => void
  }[] = [
    {
      name: "merges defaults with spec options",
      specOptions: { series: [{ type: "bar", encode: { x: "code", y: "count" } }] },
      rows: [{ code: "A", count: 5 }],
      colorMap: {},
      check: (r) => {
        expect(r.tooltip).toEqual({ trigger: "item" })
        expect(r.animationDuration).toBe(300)
        expect(r.dataset).toEqual({ source: [{ code: "A", count: 5 }] })
        expect(r.series).toEqual([{ type: "bar", encode: { x: "code", y: "count" } }])
      },
    },
    {
      name: "spec options override defaults",
      specOptions: { tooltip: { trigger: "axis" }, animationDuration: 500 },
      rows: [],
      colorMap: {},
      check: (r) => {
        expect(r.tooltip).toEqual({ trigger: "axis" })
        expect(r.animationDuration).toBe(500)
      },
    },
    {
      name: "injects color function when rows have color column",
      specOptions: { series: [{ type: "bar" }] },
      rows: [
        { code: "A", color: "blue", count: 3 },
        { code: "B", color: "red", count: 7 },
      ],
      colorMap: { blue: "#3b82f6", red: "#ef4444" },
      check: (r) => {
        const series = r.series as Record<string, unknown>[]
        expect(series).toHaveLength(1)
        const itemStyle = series[0].itemStyle as {
          color: (params: { data: Record<string, unknown> }) => string | undefined
        }
        expect(typeof itemStyle.color).toBe("function")
        expect(itemStyle.color({ data: { color: "blue" } })).toBe("#3b82f6")
        expect(itemStyle.color({ data: { color: "red" } })).toBe("#ef4444")
        expect(itemStyle.color({ data: { color: "unknown" } })).toBe("unknown")
      },
    },
    {
      name: "does not inject colors when no color column",
      specOptions: { series: [{ type: "pie" }] },
      rows: [{ code: "A", count: 5 }],
      colorMap: { blue: "#3b82f6" },
      check: (r) => {
        const series = r.series as Record<string, unknown>[]
        expect(series[0].itemStyle).toBeUndefined()
      },
    },
    {
      name: "handles empty rows",
      specOptions: { series: [{ type: "bar" }] },
      rows: [],
      colorMap: {},
      check: (r) => {
        expect(r.dataset).toEqual({ source: [] })
      },
    },
    {
      name: "preserves existing itemStyle properties",
      specOptions: { series: [{ type: "bar", itemStyle: { borderRadius: 4 } }] },
      rows: [{ code: "A", color: "blue", count: 3 }],
      colorMap: { blue: "#3b82f6" },
      check: (r) => {
        const series = r.series as Record<string, unknown>[]
        const itemStyle = series[0].itemStyle as Record<string, unknown>
        expect(itemStyle.borderRadius).toBe(4)
        expect(typeof itemStyle.color).toBe("function")
      },
    },
  ]

  cases.forEach(({ name, specOptions, rows, colorMap, check }) => {
    it(name, () => {
      const result = buildChartOption(specOptions, rows, colorMap)
      check(result)
    })
  })
})
