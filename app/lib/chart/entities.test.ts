import { describe, it, expect } from "vitest"
import {
  extractEntityIdsFromRows,
  buildEntityAxisLabel,
  interpolateTooltipTemplate,
  buildTemplateTooltipFormatter,
  findEntityInRow,
  injectEntityLabels,
  type ChartEntityMap,
} from "./entities"

const testIcon = '<svg width="12" height="12"></svg>'

const testEntity = (label: string, color: string): ChartEntityMap[string] => ({
  label,
  url: `/p/${label.toLowerCase()}`,
  textColor: color,
  backgroundColor: `${color}20`,
  iconSvg: testIcon,
})

describe("extractEntityIdsFromRows", () => {
  const prefixes = ["annotation", "callout", "tag", "search"]

  const cases: {
    name: string
    rows: Record<string, unknown>[]
    expected: string[]
  }[] = [
    {
      name: "extracts entity IDs from string values",
      rows: [
        { id: "annotation-1abc2def", code: "Trust", count: 5 },
        { id: "annotation-2xyz3ghi", code: "Empathy", count: 3 },
      ],
      expected: ["annotation-1abc2def", "annotation-2xyz3ghi"],
    },
    {
      name: "deduplicates across rows",
      rows: [
        { id: "annotation-1abc2def", count: 5 },
        { id: "annotation-1abc2def", count: 3 },
      ],
      expected: ["annotation-1abc2def"],
    },
    {
      name: "ignores non-string values",
      rows: [{ id: 42, flag: true, nothing: null }],
      expected: [],
    },
    {
      name: "ignores strings that do not match entity pattern",
      rows: [{ code: "Trust", color: "blue", file: "notes.md" }],
      expected: [],
    },
    {
      name: "matches multiple prefix types",
      rows: [
        { a: "annotation-1abc2def", b: "callout-3xyz4ghi" },
        { a: "tag-5jkl6mno", b: "search-7pqr8stu" },
      ],
      expected: ["annotation-1abc2def", "callout-3xyz4ghi", "tag-5jkl6mno", "search-7pqr8stu"],
    },
    {
      name: "returns empty for empty rows",
      rows: [],
      expected: [],
    },
    {
      name: "returns empty for empty prefixes",
      rows: [{ id: "annotation-1abc2def" }],
      expected: [],
    },
  ]

  cases.forEach(({ name, rows, expected }) => {
    it(name, () => {
      const pref = name === "returns empty for empty prefixes" ? [] : prefixes
      const result = extractEntityIdsFromRows(rows, pref)
      expect(result.sort()).toEqual(expected.sort())
    })
  })
})

describe("findEntityInRow", () => {
  const entityMap: ChartEntityMap = {
    "annotation-1abc2def": testEntity("Trust", "#cd2b31"),
    "callout-3xyz4ghi": testEntity("Finding", "#1a6b2d"),
  }

  const cases: {
    name: string
    row: Record<string, unknown>
    expected: string | null
  }[] = [
    {
      name: "finds entity in row",
      row: { id: "annotation-1abc2def", count: 5 },
      expected: "Trust",
    },
    {
      name: "returns null when no entity matches",
      row: { code: "Trust", count: 5 },
      expected: null,
    },
    {
      name: "finds first matching entity",
      row: { a: "annotation-1abc2def", b: "callout-3xyz4ghi" },
      expected: "Trust",
    },
    {
      name: "ignores non-string values",
      row: { id: 42, flag: true },
      expected: null,
    },
  ]

  cases.forEach(({ name, row, expected }) => {
    it(name, () => {
      const result = findEntityInRow(row, entityMap)
      expect(result?.label ?? null).toBe(expected)
    })
  })
})

describe("buildEntityAxisLabel", () => {
  const cases: {
    name: string
    entityMap: ChartEntityMap
    check: (result: ReturnType<typeof buildEntityAxisLabel>) => void
  }[] = [
    {
      name: "returns null for empty map",
      entityMap: {},
      check: (result) => {
        expect(result).toBeNull()
      },
    },
    {
      name: "returns formatter, rich, and triggerEvent",
      entityMap: {
        "annotation-1abc2def": testEntity("Trust", "#cd2b31"),
      },
      check: (result) => {
        if (!result) throw new Error("expected non-null")
        expect(result.triggerEvent).toBe(true)
        expect(typeof result.formatter).toBe("function")
        expect(result.rich).toHaveProperty("annotation_1abc2def")
      },
    },
    {
      name: "formatter returns rich text for matching entity",
      entityMap: {
        "annotation-1abc2def": testEntity("Trust", "#cd2b31"),
      },
      check: (result) => {
        if (!result) throw new Error("expected non-null")
        expect(result.formatter("annotation-1abc2def")).toBe("{annotation_1abc2def|Trust}")
      },
    },
    {
      name: "formatter returns plain value for non-matching value",
      entityMap: {
        "annotation-1abc2def": testEntity("Trust", "#cd2b31"),
      },
      check: (result) => {
        if (!result) throw new Error("expected non-null")
        expect(result.formatter("something-else")).toBe("something-else")
        expect(result.formatter(42)).toBe("42")
      },
    },
    {
      name: "rich styles contain correct colors",
      entityMap: {
        "callout-3xyz4ghi": testEntity("Finding", "#1a6b2d"),
      },
      check: (result) => {
        if (!result) throw new Error("expected non-null")
        const style = result.rich["callout_3xyz4ghi"]
        expect(style.color).toBe("#1a6b2d")
        expect(style.backgroundColor).toBe("#1a6b2d20")
        expect(style.borderRadius).toBe(3)
        expect(style.padding).toEqual([2, 4])
      },
    },
  ]

  cases.forEach(({ name, entityMap, check }) => {
    it(name, () => {
      check(buildEntityAxisLabel(entityMap))
    })
  })
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
    check: (result: string) => void
  }[] = [
    {
      name: "replaces column placeholders with values",
      template: "{count} annotations",
      row: { count: 5 },
      map: {},
      check: (result) => {
        expect(result).toBe("5 annotations")
      },
    },
    {
      name: "renders entity IDs as pill HTML",
      template: "{id}: {count} found",
      row: { id: "annotation-1abc2def", count: 5 },
      map: entityMap,
      check: (result) => {
        expect(result).toContain("Trust")
        expect(result).toContain("background:")
        expect(result).toContain("<svg")
        expect(result).toContain("5 found")
      },
    },
    {
      name: "escapes string values",
      template: "{label}: {count}",
      row: { label: "<script>alert</script>", count: 3 },
      map: {},
      check: (result) => {
        expect(result).toContain("&lt;script&gt;")
        expect(result).not.toContain("<script>")
      },
    },
    {
      name: "leaves unknown placeholders unchanged",
      template: "{missing} items",
      row: { count: 5 },
      map: {},
      check: (result) => {
        expect(result).toBe("{missing} items")
      },
    },
    {
      name: "handles multiple placeholders",
      template: "{code}: {count} of {total}",
      row: { code: "Trust", count: 5, total: 20 },
      map: {},
      check: (result) => {
        expect(result).toBe("Trust: 5 of 20")
      },
    },
    {
      name: "handles null and undefined values",
      template: "{a} and {b}",
      row: { a: null, b: undefined },
      map: {},
      check: (result) => {
        expect(result).toBe(" and ")
      },
    },
    {
      name: "renders plain text without placeholders",
      template: "static text",
      row: { count: 5 },
      map: {},
      check: (result) => {
        expect(result).toBe("static text")
      },
    },
    {
      name: "converts **bold** to <b>",
      template: "**{count}** annotations",
      row: { count: 5 },
      map: {},
      check: (result) => {
        expect(result).toBe("<b>5</b> annotations")
      },
    },
    {
      name: "converts *italic* to <i>",
      template: "*{label}* — {count}",
      row: { label: "Trust", count: 5 },
      map: {},
      check: (result) => {
        expect(result).toBe("<i>Trust</i> — 5")
      },
    },
    {
      name: "converts bold and italic together",
      template: "**{count}** *occurrences*",
      row: { count: 5 },
      map: {},
      check: (result) => {
        expect(result).toBe("<b>5</b> <i>occurrences</i>")
      },
    },
  ]

  cases.forEach(({ name, template, row, map, check }) => {
    it(name, () => {
      check(interpolateTooltipTemplate(template, row, map))
    })
  })
})

describe("buildTemplateTooltipFormatter", () => {
  const entityMap: ChartEntityMap = {
    "annotation-1abc2def": testEntity("Trust", "#cd2b31"),
  }

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
      name: "formats entity ID as pill in template",
      template: "{id}: {count} found",
      map: entityMap,
      params: {
        marker: "",
        data: { id: "annotation-1abc2def", count: 5 },
      },
      check: (result) => {
        expect(result).toContain("Trust")
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
      const formatter = buildTemplateTooltipFormatter(template, map)
      check(formatter(params))
    })
  })
})

describe("injectEntityLabels", () => {
  const entityMap: ChartEntityMap = {
    "annotation-1abc2def": testEntity("Trust", "#cd2b31"),
  }
  const template = "{count} annotations"

  const cases: {
    name: string
    option: Record<string, unknown>
    map: ChartEntityMap
    check: (result: Record<string, unknown>) => void
  }[] = [
    {
      name: "injects tooltip formatter without entities",
      option: { series: [{ type: "bar" }] },
      map: {},
      check: (result) => {
        const tooltip = result.tooltip as Record<string, unknown>
        expect(typeof tooltip.formatter).toBe("function")
        expect(result.xAxis).toBeUndefined()
      },
    },
    {
      name: "injects axisLabel into xAxis and yAxis with entities",
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
      name: "injects tooltip formatter",
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
      check(injectEntityLabels(option, map, template))
    })
  })
})
