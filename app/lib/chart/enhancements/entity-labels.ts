import { linkifyEntityIds } from "~/lib/markdown/linkify/entities"
import type { ChartEntityMap } from "../entities"

export interface EntityLabelConfig {
  entityMap: ChartEntityMap
  tooltipTemplate: string
  renderHtml: (md: string) => string
}

export const enhanceEntityLabels = (
  option: Record<string, unknown>,
  config: EntityLabelConfig
): Record<string, unknown> => {
  const { entityMap, tooltipTemplate, renderHtml } = config
  const tooltipFormatter = buildTooltipFormatter(tooltipTemplate, entityMap, renderHtml)
  const existingTooltip = (option.tooltip ?? {}) as Record<string, unknown>

  let result: Record<string, unknown> = {
    ...option,
    tooltip: { ...existingTooltip, formatter: tooltipFormatter },
  }

  const hasEntities = Object.keys(entityMap).length > 0
  if (hasEntities) {
    result = injectAxisLabels(result, entityMap)
    result = injectLegendLabels(result, entityMap)
  }

  return result
}

const sanitizeStyleKey = (id: string): string => id.replace(/[^a-zA-Z0-9]/g, "_")

const buildRichStyles = (entityMap: ChartEntityMap): Record<string, Record<string, unknown>> => {
  const rich: Record<string, Record<string, unknown>> = {}
  for (const [id, entity] of Object.entries(entityMap)) {
    rich[sanitizeStyleKey(id)] = {
      color: entity.textColor,
      backgroundColor: entity.backgroundColor,
      borderRadius: 3,
      padding: [2, 4],
      fontSize: 11,
    }
  }
  return rich
}

const buildEntityFormatter =
  (entityMap: ChartEntityMap) =>
  (value: string | number): string => {
    const key = String(value)
    const entity = entityMap[key]
    if (!entity) return key
    return `{${sanitizeStyleKey(key)}|${entity.label}}`
  }

const injectIntoAxis = (
  axis: unknown,
  rich: Record<string, Record<string, unknown>>,
  formatter: (value: string | number) => string
): unknown => {
  if (Array.isArray(axis)) return axis.map((a) => injectIntoAxis(a, rich, formatter))
  const existing = (axis ?? {}) as Record<string, unknown>
  const existingLabel = (existing.axisLabel ?? {}) as Record<string, unknown>
  return {
    ...existing,
    axisLabel: { ...existingLabel, formatter, rich, triggerEvent: true },
  }
}

const injectAxisLabels = (
  option: Record<string, unknown>,
  entityMap: ChartEntityMap
): Record<string, unknown> => {
  const rich = buildRichStyles(entityMap)
  const formatter = buildEntityFormatter(entityMap)
  return {
    ...option,
    xAxis: injectIntoAxis(option.xAxis ?? {}, rich, formatter),
    yAxis: injectIntoAxis(option.yAxis ?? {}, rich, formatter),
  }
}

export const injectLegendLabels = (
  option: Record<string, unknown>,
  entityMap: ChartEntityMap
): Record<string, unknown> => {
  const rich = buildRichStyles(entityMap)
  const formatter = buildEntityFormatter(entityMap)
  const existing = (option.legend ?? {}) as Record<string, unknown>
  const existingTextStyle = (existing.textStyle ?? {}) as Record<string, unknown>
  return {
    ...option,
    legend: {
      ...existing,
      formatter,
      textStyle: { ...existingTextStyle, rich },
    },
  }
}

const interpolateValue = (value: unknown, entityMap: ChartEntityMap): string => {
  if (typeof value === "string" && entityMap[value]) {
    const entity = entityMap[value]
    return `[${entity.label}](file://${value})`
  }
  if (value === undefined || value === null) return ""
  return String(value)
}

export const interpolateTooltipTemplate = (
  template: string,
  row: Record<string, unknown>,
  entityMap: ChartEntityMap
): string =>
  template.replace(/\{(\w+)\}/g, (match, key: string) => {
    if (!(key in row)) return match
    return interpolateValue(row[key], entityMap)
  })

const buildResolveName =
  (entityMap: ChartEntityMap) =>
  (id: string): string | null =>
    entityMap[id]?.label ?? null

const formatTemplateEntry = (
  template: string,
  item: Record<string, unknown>,
  entityMap: ChartEntityMap,
  renderHtml: (md: string) => string
): string => {
  const data = item.data as Record<string, unknown> | undefined
  if (!data) return ""
  const interpolated = interpolateTooltipTemplate(template, data, entityMap)
  const linked = linkifyEntityIds(interpolated, buildResolveName(entityMap))
  return renderHtml(linked)
}

export const buildTooltipFormatter =
  (
    template: string,
    entityMap: ChartEntityMap,
    renderHtml: (md: string) => string
  ): ((params: unknown) => string) =>
  (params: unknown): string => {
    const items = Array.isArray(params) ? params : [params]
    return items
      .map((item) =>
        formatTemplateEntry(template, item as Record<string, unknown>, entityMap, renderHtml)
      )
      .join('<hr style="margin:4px 0;border:none;border-top:1px solid #eee">')
  }
