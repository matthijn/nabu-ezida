export interface ChartEntityLink {
  label: string
  url: string
  textColor: string
  backgroundColor: string
  iconSvg: string
}

export type ChartEntityMap = Record<string, ChartEntityLink>

const buildEntityPattern = (prefixes: string[]): RegExp =>
  new RegExp(`^(${prefixes.join("|")})-[a-zA-Z0-9][a-zA-Z0-9_-]*$`)

export const extractEntityIdsFromRows = (
  rows: Record<string, unknown>[],
  prefixes: string[]
): string[] => {
  if (prefixes.length === 0) return []
  const pattern = buildEntityPattern(prefixes)
  const ids = new Set<string>()
  for (const row of rows) {
    for (const value of Object.values(row)) {
      if (typeof value === "string" && pattern.test(value)) {
        ids.add(value)
      }
    }
  }
  return [...ids]
}

export const findEntityInRow = (
  row: Record<string, unknown>,
  entityMap: ChartEntityMap
): ChartEntityLink | null => {
  for (const value of Object.values(row)) {
    if (typeof value === "string" && entityMap[value]) {
      return entityMap[value]
    }
  }
  return null
}

const sanitizeStyleKey = (id: string): string => id.replace(/[^a-zA-Z0-9]/g, "_")

interface AxisLabelConfig {
  formatter: (value: string | number) => string
  rich: Record<string, Record<string, unknown>>
  triggerEvent: boolean
}

export const buildEntityAxisLabel = (entityMap: ChartEntityMap): AxisLabelConfig | null => {
  const entries = Object.entries(entityMap)
  if (entries.length === 0) return null

  const rich: Record<string, Record<string, unknown>> = {}
  for (const [id, entity] of entries) {
    rich[sanitizeStyleKey(id)] = {
      color: entity.textColor,
      backgroundColor: entity.backgroundColor,
      borderRadius: 3,
      padding: [2, 4],
      fontSize: 11,
    }
  }

  const formatter = (value: string | number): string => {
    const key = String(value)
    const entity = entityMap[key]
    if (!entity) return key
    return `{${sanitizeStyleKey(key)}|${entity.label}}`
  }

  return { formatter, rich, triggerEvent: true }
}

const escapeHtml = (str: string): string =>
  str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

const formatEntityPillHtml = (entity: ChartEntityLink): string =>
  `<span style="display:inline-flex;align-items:center;gap:3px;background:${entity.backgroundColor};color:${entity.textColor};border-radius:3px;padding:1px 5px;font-size:12px;">${entity.iconSvg}${escapeHtml(entity.label)}</span>`

const interpolateValue = (value: unknown, entityMap: ChartEntityMap): string => {
  if (typeof value === "string" && entityMap[value]) return formatEntityPillHtml(entityMap[value])
  if (value === undefined || value === null) return ""
  return escapeHtml(String(value))
}

const convertInlineMarkdown = (html: string): string =>
  html.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\*(.+?)\*/g, "<i>$1</i>")

export const interpolateTooltipTemplate = (
  template: string,
  row: Record<string, unknown>,
  entityMap: ChartEntityMap
): string => {
  const interpolated = template.replace(/\{(\w+)\}/g, (match, key: string) => {
    if (!(key in row)) return match
    return interpolateValue(row[key], entityMap)
  })
  return convertInlineMarkdown(interpolated)
}

const formatTemplateEntry = (
  template: string,
  item: Record<string, unknown>,
  entityMap: ChartEntityMap
): string => {
  const data = item.data as Record<string, unknown> | undefined
  if (!data) return ""
  return interpolateTooltipTemplate(template, data, entityMap)
}

export const buildTemplateTooltipFormatter =
  (template: string, entityMap: ChartEntityMap): ((params: unknown) => string) =>
  (params: unknown): string => {
    const items = Array.isArray(params) ? params : [params]
    return items
      .map((item) => formatTemplateEntry(template, item as Record<string, unknown>, entityMap))
      .join('<hr style="margin:4px 0;border:none;border-top:1px solid #eee">')
  }

const injectIntoAxis = (axis: unknown, labelConfig: AxisLabelConfig): unknown => {
  if (Array.isArray(axis)) return axis.map((a) => injectIntoAxis(a, labelConfig))
  const existing = (axis ?? {}) as Record<string, unknown>
  const existingLabel = (existing.axisLabel ?? {}) as Record<string, unknown>
  return {
    ...existing,
    axisLabel: { ...existingLabel, ...labelConfig },
  }
}

export const injectEntityLabels = (
  option: Record<string, unknown>,
  entityMap: ChartEntityMap,
  tooltipTemplate: string
): Record<string, unknown> => {
  const labelConfig = buildEntityAxisLabel(entityMap)
  const tooltipFormatter = buildTemplateTooltipFormatter(tooltipTemplate, entityMap)
  const existingTooltip = (option.tooltip ?? {}) as Record<string, unknown>

  const result: Record<string, unknown> = {
    ...option,
    tooltip: { ...existingTooltip, formatter: tooltipFormatter },
  }

  if (labelConfig) {
    result.xAxis = injectIntoAxis(option.xAxis ?? {}, labelConfig)
    result.yAxis = injectIntoAxis(option.yAxis ?? {}, labelConfig)
  }

  return result
}
