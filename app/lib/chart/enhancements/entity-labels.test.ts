import { describe, it, expect } from "vitest"
import {
  enhanceEntityLabels,
  injectLegendLabels,
  interpolateTooltipTemplate,
  buildTooltipFormatter,
  type EntityLabelConfig,
} from "./entity-labels"
import type { ChartEntityMap } from "../entities"

const testEntity = (label: string, color: string): ChartEntityMap[string] => ({
  label,
  url: `/p/${label.toLowerCase()}`,
  textColor: color,
  backgroundColor: `${color}20`,
})

describe("interpolateTooltipTemplate", () => {
  const entityMap: ChartEntityMap = {
    "annotation-1abc2def": testEntity("Trust", "#cd2b31"),
  }

  const cases: {
    name: string
    template: string
    row: Record<string, unknown>
    map: ChartEntityMap
    expected: string
  }[] = [
    {
      name: "replaces column placeholders with values",
      template: "{count} annotations",
      row: { count: 5 },
      map: {},
      expected: "5 annotations",
    },
    {
      name: "renders entity IDs as markdown links",
      template: "{id}: {count} found",
      row: { id: "annotation-1abc2def", count: 5 },
      map: entityMap,
      expected: "[Trust](file://annotation-1abc2def): 5 found",
    },
    {
      name: "passes through string values as-is",
      template: "{label}: {count}",
      row: { label: "<script>alert</script>", count: 3 },
      map: {},
      expected: "<script>alert</script>: 3",
    },
    {
      name: "leaves unknown placeholders unchanged",
      template: "{missing} items",
      row: { count: 5 },
      map: {},
      expected: "{missing} items",
    },
    {
      name: "handles multiple placeholders",
      template: "{code}: {count} of {total}",
      row: { code: "Trust", count: 5, total: 20 },
      map: {},
      expected: "Trust: 5 of 20",
    },
    {
      name: "handles null and undefined values",
      template: "{a} and {b}",
      row: { a: null, b: undefined },
      map: {},
      expected: " and ",
    },
    {
      name: "preserves markdown formatting in template",
      template: "**{count}** *occurrences*",
      row: { count: 5 },
      map: {},
      expected: "**5** *occurrences*",
    },
    {
      name: "preserves newlines in template",
      template: "**{code}**\nCount: {count}",
      row: { code: "Trust", count: 5 },
      map: {},
      expected: "**Trust**\nCount: 5",
    },
    {
      name: "preserves pipe tables in template",
      template: "| Metric | Value |\n|---|---|\n| Count | {count} |",
      row: { count: 5 },
      map: {},
      expected: "| Metric | Value |\n|---|---|\n| Count | 5 |",
    },
  ]

  cases.forEach(({ name, template, row, map, expected }) => {
    it(name, () => {
      expect(interpolateTooltipTemplate(template, row, map)).toBe(expected)
    })
  })
})

describe("buildTooltipFormatter", () => {
  const entityMap: ChartEntityMap = {
    "annotation-1abc2def": testEntity("Trust", "#cd2b31"),
  }

  const identity = (md: string): string => md

  const cases: {
    name: string
    template: string
    map: ChartEntityMap
    params: unknown
    check: (result: string) => void
  }[] = [
    {
      name: "formats single item without marker",
      template: "{count} annotations",
      map: {},
      params: {
        marker: '<span class="dot"></span>',
        data: { count: 5 },
      },
      check: (result) => {
        expect(result).not.toContain("dot")
        expect(result).toBe("5 annotations")
      },
    },
    {
      name: "formats entity ID as markdown link in template",
      template: "{id}: {count} found",
      map: entityMap,
      params: {
        marker: "",
        data: { id: "annotation-1abc2def", count: 5 },
      },
      check: (result) => {
        expect(result).toContain("[Trust](file://annotation-1abc2def)")
        expect(result).toContain("5 found")
      },
    },
    {
      name: "joins array params with separator",
      template: "{count} items",
      map: {},
      params: [
        { marker: "", data: { count: 5 } },
        { marker: "", data: { count: 3 } },
      ],
      check: (result) => {
        expect(result).toContain("<hr")
        expect(result).toContain("5 items")
        expect(result).toContain("3 items")
      },
    },
    {
      name: "linkifies literal entity IDs in template text",
      template: "| annotation-1abc2def | {count} |",
      map: entityMap,
      params: { marker: "", data: { count: 5 } },
      check: (result) => {
        expect(result).toContain("[Trust](file://annotation-1abc2def)")
        expect(result).toContain("5")
      },
    },
    {
      name: "does not double-linkify entity IDs from column values",
      template: "{id}: {count}",
      map: entityMap,
      params: { marker: "", data: { id: "annotation-1abc2def", count: 5 } },
      check: (result) => {
        const linkCount = (result.match(/\[Trust\]/g) ?? []).length
        expect(linkCount).toBe(1)
      },
    },
    {
      name: "handles missing data gracefully",
      template: "{count} items",
      map: {},
      params: { marker: "" },
      check: (result) => {
        expect(result).toBe("")
      },
    },
  ]

  cases.forEach(({ name, template, map, params, check }) => {
    it(name, () => {
      const formatter = buildTooltipFormatter(template, map, identity)
      check(formatter(params))
    })
  })
})

describe("injectLegendLabels", () => {
  const entityMap: ChartEntityMap = {
    "annotation-1abc2def": testEntity("Trust", "#cd2b31"),
    "callout-3xyz4ghi": testEntity("Finding", "#1a6b2d"),
  }

  const cases: {
    name: string
    option: Record<string, unknown>
    check: (result: Record<string, unknown>) => void
  }[] = [
    {
      name: "injects formatter and rich into legend",
      option: {},
      check: (result) => {
        const legend = result.legend as Record<string, unknown>
        expect(typeof legend.formatter).toBe("function")
        const textStyle = legend.textStyle as Record<string, unknown>
        expect(textStyle.rich).toBeDefined()
      },
    },
    {
      name: "merges with existing legend config",
      option: { legend: { orient: "vertical" } },
      check: (result) => {
        const legend = result.legend as Record<string, unknown>
        expect(legend.orient).toBe("vertical")
        expect(typeof legend.formatter).toBe("function")
      },
    },
    {
      name: "merges with existing textStyle",
      option: { legend: { textStyle: { fontSize: 14 } } },
      check: (result) => {
        const legend = result.legend as Record<string, unknown>
        const textStyle = legend.textStyle as Record<string, unknown>
        expect(textStyle.fontSize).toBe(14)
        expect(textStyle.rich).toBeDefined()
      },
    },
    {
      name: "entity formatter converts entity IDs to rich text",
      option: {},
      check: (result) => {
        const legend = result.legend as Record<string, unknown>
        const formatter = legend.formatter as (v: string | number) => string
        expect(formatter("annotation-1abc2def")).toBe("{annotation_1abc2def|Trust}")
      },
    },
    {
      name: "entity formatter passes through non-entity names",
      option: {},
      check: (result) => {
        const legend = result.legend as Record<string, unknown>
        const formatter = legend.formatter as (v: string | number) => string
        expect(formatter("plain-name")).toBe("plain-name")
        expect(formatter(42)).toBe("42")
      },
    },
    {
      name: "rich styles contain correct colors and dimensions",
      option: {},
      check: (result) => {
        const legend = result.legend as Record<string, unknown>
        const textStyle = legend.textStyle as Record<string, unknown>
        const rich = textStyle.rich as Record<string, Record<string, unknown>>
        const style = rich["callout_3xyz4ghi"]
        expect(style.color).toBe("#1a6b2d")
        expect(style.backgroundColor).toBe("#1a6b2d20")
        expect(style.borderRadius).toBe(3)
        expect(style.padding).toEqual([2, 4])
        expect(style.fontSize).toBe(11)
      },
    },
  ]

  cases.forEach(({ name, option, check }) => {
    it(name, () => {
      check(injectLegendLabels(option, entityMap))
    })
  })
})

describe("enhanceEntityLabels", () => {
  const entityMap: ChartEntityMap = {
    "annotation-1abc2def": testEntity("Trust", "#cd2b31"),
  }
  const template = "{count} annotations"
  const identity = (md: string): string => md

  const buildConfig = (map: ChartEntityMap): EntityLabelConfig => ({
    entityMap: map,
    tooltipTemplate: template,
    renderHtml: identity,
  })

  const cases: {
    name: string
    option: Record<string, unknown>
    map: ChartEntityMap
    check: (result: Record<string, unknown>) => void
  }[] = [
    {
      name: "empty entityMap: only tooltip formatter injected",
      option: { series: [{ type: "bar" }] },
      map: {},
      check: (result) => {
        const tooltip = result.tooltip as Record<string, unknown>
        expect(typeof tooltip.formatter).toBe("function")
        expect(result.xAxis).toBeUndefined()
        expect(result.legend).toBeUndefined()
      },
    },
    {
      name: "with entities: axis labels injected",
      option: { series: [{ type: "bar" }] },
      map: entityMap,
      check: (result) => {
        const xAxis = result.xAxis as Record<string, unknown>
        const yAxis = result.yAxis as Record<string, unknown>
        const xLabel = xAxis.axisLabel as Record<string, unknown>
        const yLabel = yAxis.axisLabel as Record<string, unknown>
        expect(xLabel.triggerEvent).toBe(true)
        expect(typeof xLabel.formatter).toBe("function")
        expect(xLabel.rich).toBeDefined()
        expect(yLabel.triggerEvent).toBe(true)
      },
    },
    {
      name: "with entities: legend labels injected",
      option: { series: [{ type: "line" }] },
      map: entityMap,
      check: (result) => {
        const legend = result.legend as Record<string, unknown>
        expect(typeof legend.formatter).toBe("function")
        const textStyle = legend.textStyle as Record<string, unknown>
        expect(textStyle.rich).toBeDefined()
      },
    },
    {
      name: "with entities: tooltip formatter injected",
      option: { series: [{ type: "bar" }] },
      map: entityMap,
      check: (result) => {
        const tooltip = result.tooltip as Record<string, unknown>
        expect(typeof tooltip.formatter).toBe("function")
      },
    },
    {
      name: "merges with existing tooltip config",
      option: { tooltip: { trigger: "axis" } },
      map: entityMap,
      check: (result) => {
        const tooltip = result.tooltip as Record<string, unknown>
        expect(tooltip.trigger).toBe("axis")
        expect(typeof tooltip.formatter).toBe("function")
      },
    },
    {
      name: "merges with existing axisLabel config",
      option: {
        xAxis: { type: "category", axisLabel: { rotate: 45 } },
      },
      map: entityMap,
      check: (result) => {
        const xAxis = result.xAxis as Record<string, unknown>
        const xLabel = xAxis.axisLabel as Record<string, unknown>
        expect(xLabel.rotate).toBe(45)
        expect(xLabel.triggerEvent).toBe(true)
        expect(xAxis.type).toBe("category")
      },
    },
    {
      name: "handles array axes",
      option: {
        xAxis: [{ type: "category" }, { type: "value" }],
      },
      map: entityMap,
      check: (result) => {
        const axes = result.xAxis as Record<string, unknown>[]
        expect(Array.isArray(axes)).toBe(true)
        expect(axes).toHaveLength(2)
        const label0 = axes[0].axisLabel as Record<string, unknown>
        expect(label0.triggerEvent).toBe(true)
        expect(axes[0].type).toBe("category")
      },
    },
    {
      name: "series names preserved as entity IDs (not resolved)",
      option: {
        series: [
          { type: "line", name: "annotation-1abc2def" },
          { type: "line", name: "plain-name" },
        ],
      },
      map: entityMap,
      check: (result) => {
        const series = result.series as Record<string, unknown>[]
        expect(series[0].name).toBe("annotation-1abc2def")
        expect(series[1].name).toBe("plain-name")
      },
    },
    {
      name: "preserves series and other properties",
      option: { series: [{ type: "line" }], grid: { top: 10 } },
      map: entityMap,
      check: (result) => {
        expect(result.series).toEqual([{ type: "line" }])
        expect(result.grid).toEqual({ top: 10 })
      },
    },
  ]

  cases.forEach(({ name, option, map, check }) => {
    it(name, () => {
      check(enhanceEntityLabels(option, buildConfig(map)))
    })
  })
})
