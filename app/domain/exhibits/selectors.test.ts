import { describe, it, expect } from "vitest"
import { inferChartSubtype, collectExhibits, groupByKind } from "./selectors"
import type { ExhibitItem, ExhibitKind } from "./types"

describe("inferChartSubtype", () => {
  interface Case {
    name: string
    options: Record<string, unknown>
    expected: string
  }

  const cases: Case[] = [
    { name: "bar series", options: { series: [{ type: "bar" }] }, expected: "bar" },
    { name: "line series", options: { series: [{ type: "line" }] }, expected: "line" },
    { name: "pie series", options: { series: [{ type: "pie" }] }, expected: "pie" },
    { name: "scatter series", options: { series: [{ type: "scatter" }] }, expected: "scatter" },
    { name: "unknown series type", options: { series: [{ type: "radar" }] }, expected: "other" },
    { name: "empty series array", options: { series: [] }, expected: "other" },
    { name: "no series key", options: {}, expected: "other" },
    { name: "series is not array", options: { series: "bar" }, expected: "other" },
    {
      name: "multiple series uses first",
      options: { series: [{ type: "line" }, { type: "bar" }] },
      expected: "line",
    },
  ]

  it.each(cases)("$name → $expected", ({ options, expected }) => {
    expect(inferChartSubtype(options)).toBe(expected)
  })
})

describe("collectExhibits", () => {
  const chartBlock = (id: string, title: string, seriesType: string) =>
    JSON.stringify({
      id,
      title,
      query: "SELECT 1",
      tooltip: "",
      options: { series: [{ type: seriesType }] },
    })

  const wrapInDocument = (chartJson: string) =>
    `# Some doc\n\n\`\`\`json-chart\n${chartJson}\n\`\`\`\n`

  it("collects charts from multiple files", () => {
    const files = {
      "doc_a.md": wrapInDocument(chartBlock("chart-001", "Revenue", "bar")),
      "doc_b.md": wrapInDocument(chartBlock("chart-002", "Trends", "line")),
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

  it("collects multiple charts from a single file", () => {
    const doc = [
      "# Multi chart doc",
      "",
      "```json-chart",
      chartBlock("chart-a", "First", "pie"),
      "```",
      "",
      "```json-chart",
      chartBlock("chart-b", "Second", "scatter"),
      "```",
    ].join("\n")

    const exhibits = collectExhibits({ "multi.md": doc })

    expect(exhibits).toHaveLength(2)
    expect(exhibits[0].subtype).toBe("pie")
    expect(exhibits[1].subtype).toBe("scatter")
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
