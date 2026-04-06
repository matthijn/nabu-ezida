export type ChartColorMap = Record<string, string>

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

export const enhanceSeriesColors = (
  option: Record<string, unknown>,
  rows: Record<string, unknown>[],
  colorMap: ChartColorMap
): Record<string, unknown> => {
  const needsColorInjection =
    hasColorColumn(rows) && Object.keys(colorMap).length > 0 && Array.isArray(option.series)

  if (!needsColorInjection) return option

  return {
    ...option,
    series: injectSeriesColors(option.series as Record<string, unknown>[], colorMap),
  }
}
