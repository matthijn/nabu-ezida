import { enhanceSeriesColors, type ChartColorMap } from "./enhancements/series-colors"
import { enhanceCategoryAxis } from "./enhancements/category-axis"

export type { ChartColorMap }

const TOOLTIP_FONT = "font-family:var(--font-body),sans-serif;"
const DEFAULT_TOOLTIP = { trigger: "item", appendToBody: true, extraCssText: TOOLTIP_FONT }
const DEFAULT_ANIMATION_DURATION = 300

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

  return enhanceCategoryAxis(enhanceSeriesColors(merged, rows, colorMap))
}
