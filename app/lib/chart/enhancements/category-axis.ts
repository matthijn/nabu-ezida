const DEFAULT_CATEGORY_AXIS_LABEL = { interval: 0, rotate: -45, margin: 12 }

const isCategoryAxis = (axis: unknown): boolean =>
  typeof axis === "object" && axis !== null && (axis as Record<string, unknown>).type === "category"

const injectCategoryDefaults = (axis: unknown): unknown => {
  if (Array.isArray(axis)) return axis.map(injectCategoryDefaults)
  if (!isCategoryAxis(axis)) return axis
  const existing = axis as Record<string, unknown>
  const existingLabel = (existing.axisLabel ?? {}) as Record<string, unknown>
  return {
    ...existing,
    axisLabel: { ...DEFAULT_CATEGORY_AXIS_LABEL, ...existingLabel },
  }
}

export const enhanceCategoryAxis = (option: Record<string, unknown>): Record<string, unknown> => {
  const result = { ...option }
  if (result.xAxis) result.xAxis = injectCategoryDefaults(result.xAxis)
  if (result.yAxis) result.yAxis = injectCategoryDefaults(result.yAxis)
  return result
}
