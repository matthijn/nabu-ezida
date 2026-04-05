export type ChartColorMap = Record<string, string>

const DEFAULT_TOOLTIP = { trigger: "item" }
const DEFAULT_ANIMATION_DURATION = 300

const buildColorFunction =
  (colorMap: ChartColorMap) => (params: { data: Record<string, unknown> }) => {
    const color = params.data?.color
    return typeof color === "string" ? (colorMap[color] ?? color) : undefined
  }

const injectSeriesColors = (
  series: Record<string, unknown>[],
  colorMap: ChartColorMap
): Record<string, unknown>[] => {
  const colorFn = buildColorFunction(colorMap)
  return series.map((s) => ({
    ...s,
    itemStyle: { ...((s.itemStyle as Record<string, unknown>) ?? {}), color: colorFn },
  }))
}

const hasColorColumn = (rows: Record<string, unknown>[]): boolean =>
  rows.length > 0 && "color" in rows[0]

export const buildChartOption = (
  specOptions: Record<string, unknown>,
  rows: Record<string, unknown>[],
  colorMap: ChartColorMap
): Record<string, unknown> => {
  const defaults: Record<string, unknown> = {
    tooltip: DEFAULT_TOOLTIP,
    animationDuration: DEFAULT_ANIMATION_DURATION,
    dataset: { source: rows },
  }

  const merged: Record<string, unknown> = { ...defaults, ...specOptions, dataset: { source: rows } }

  const needsColorInjection =
    hasColorColumn(rows) && Object.keys(colorMap).length > 0 && Array.isArray(merged.series)

  if (needsColorInjection) {
    merged.series = injectSeriesColors(merged.series as Record<string, unknown>[], colorMap)
  }

  return merged
}
