import type { FileStore } from "~/lib/files/store"
import { toDisplayName } from "~/lib/files/filename"
import { getCharts } from "~/domain/data-blocks/chart/selectors"
import type { ChartBlock } from "~/domain/data-blocks/chart/schema"
import type { ExhibitItem, ChartSubtype, ExhibitKind } from "./types"

export const inferChartSubtype = (options: Record<string, unknown>): ChartSubtype => {
  const series = options.series
  if (!Array.isArray(series) || series.length === 0) return "other"
  const type = (series[0] as Record<string, unknown>).type
  switch (type) {
    case "bar":
      return "bar"
    case "line":
      return "line"
    case "pie":
      return "pie"
    case "scatter":
      return "scatter"
    default:
      return "other"
  }
}

const chartToExhibit = (chart: ChartBlock, filename: string): ExhibitItem => ({
  id: chart.id,
  title: chart.caption.label,
  kind: "chart",
  subtype: inferChartSubtype(chart.options),
  documentId: filename,
  documentTitle: toDisplayName(filename),
})

export const collectExhibits = (files: FileStore): ExhibitItem[] =>
  Object.entries(files).flatMap(([filename, raw]) =>
    getCharts(raw).map((chart) => chartToExhibit(chart, filename))
  )

export interface ExhibitGroup {
  kind: ExhibitKind
  items: ExhibitItem[]
}

export const groupByKind = (exhibits: ExhibitItem[]): ExhibitGroup[] => {
  const kindMap = new Map<ExhibitKind, ExhibitItem[]>()
  for (const exhibit of exhibits) {
    const existing = kindMap.get(exhibit.kind)
    if (existing) existing.push(exhibit)
    else kindMap.set(exhibit.kind, [exhibit])
  }
  return Array.from(kindMap, ([kind, items]) => ({ kind, items }))
}
