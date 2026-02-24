const sortKeys = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(sortKeys)
  if (value !== null && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortKeys((value as Record<string, unknown>)[key])
        return acc
      }, {})
  }
  return value
}

const stableStringify = (value: unknown): string =>
  JSON.stringify(sortKeys(value))

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value)

export const dedupArray = <T>(arr: T[]): T[] => {
  const seen = new Set<string>()
  return arr.filter((item) => {
    const key = stableStringify(item)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export const dedupArraysIn = (value: unknown): unknown => {
  if (Array.isArray(value)) return dedupArray(value.map(dedupArraysIn))
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, dedupArraysIn(v)])
    )
  }
  return value
}
