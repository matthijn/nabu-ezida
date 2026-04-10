import { describe, it, expect } from "vitest"
import { inferChartSubtype, collectExhibits, groupByKind } from "./selectors"
import type { ChartType } from "~/lib/chart/types"
import type { ChartSubtype, ExhibitItem, ExhibitKind } from "./types"

describe("inferChartSubtype", () => {
  interface Case {
    type: ChartType
    expected: ChartSubtype
  }

  const cases: Case[] = [
    { type: "bar", expected: "bar" },
    { type: "stacked-bar", expected: "bar" },
    { type: "grouped-bar", expected: "bar" },
    { type: "line", expected: "line" },
    { type: "area", expected: "line" },
    { type: "pie", expected: "pie" },
    { type: "treemap", expected: "pie" },
    { type: "scatter", expected: "scatter" },
    { type: "heatmap", expected: "other" },
  ]

  it.each(cases)("$type → $expected", ({ type, expected }) => {
    expect(inferChartSubtype(type)).toBe(expected)
  })
})

describe("collectExhibits", () => {
  const axisChartBlock = (id: string, title: string, type: ChartType) =>
    JSON.stringify({
      id,
      caption: { label: title },
      query: "SELECT 1",
      spec: { type, x: "month", y: "revenue", color: "blue" },
    })

  const wrapInDocument = (chartJson: string) =>
    `# Some doc\n\n\`\`\`json-chart\n${chartJson}\n\`\`\`\n`

  it("collects charts from multiple files", () => {
    const files = {
      "doc_a.md": wrapInDocument(axisChartBlock("chart-001", "Revenue", "bar")),
      "doc_b.md": wrapInDocument(axisChartBlock("chart-002", "Trends", "line")),
    }

    const exhibits = collectExhibits(files)

    expect(exhibits).toHaveLength(2)
    expect(exhibits[0]).toEqual({
      id: "chart-001",
      title: "Revenue",
      kind: "chart",
      subtype: "bar",
      documentId: "doc_a.md",
      documentTitle: "Doc A",
    })
    expect(exhibits[1]).toEqual({
      id: "chart-002",
      title: "Trends",
      kind: "chart",
      subtype: "line",
      documentId: "doc_b.md",
      documentTitle: "Doc B",
    })
  })

  it("returns empty for files without charts", () => {
    const files = { "doc.md": "# Just text\n\nNo charts here." }
    expect(collectExhibits(files)).toEqual([])
  })

  it("maps stacked-bar and area to their canonical subtypes", () => {
    const doc = [
      "# Multi chart doc",
      "",
      "```json-chart",
      axisChartBlock("chart-a", "First", "stacked-bar"),
      "```",
      "",
      "```json-chart",
      axisChartBlock("chart-b", "Second", "area"),
      "```",
    ].join("\n")

    const exhibits = collectExhibits({ "multi.md": doc })

    expect(exhibits).toHaveLength(2)
    expect(exhibits[0].subtype).toBe("bar")
    expect(exhibits[1].subtype).toBe("line")
  })
})

describe("groupByKind", () => {
  const exhibit = (kind: ExhibitKind, id: string): ExhibitItem => ({
    id,
    title: id,
    kind,
    subtype: "bar",
    documentId: "doc.md",
    documentTitle: "Doc",
  })

  it("groups exhibits by kind", () => {
    const items = [exhibit("chart", "a"), exhibit("chart", "b")]
    const groups = groupByKind(items)

    expect(groups).toHaveLength(1)
    expect(groups[0].kind).toBe("chart")
    expect(groups[0].items).toHaveLength(2)
  })

  it("returns empty for no exhibits", () => {
    expect(groupByKind([])).toEqual([])
  })
})
