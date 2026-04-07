export interface ChartEntityLink {
  label: string
  url: string
  textColor: string
  backgroundColor: string
}

export type ChartEntityMap = Record<string, ChartEntityLink>

const ENTITY_SUFFIX = "[a-z0-9]{8}"

const buildEntityPattern = (prefixes: string[]): RegExp =>
  new RegExp(`^(${prefixes.join("|")})-${ENTITY_SUFFIX}$`)

const buildEntityScanPattern = (prefixes: string[]): RegExp =>
  new RegExp(`(?<![\\w-])(?:${prefixes.join("|")})-${ENTITY_SUFFIX}`, "g")

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

export const extractEntityIdsFromText = (text: string, prefixes: string[]): string[] => {
  if (prefixes.length === 0) return []
  const pattern = buildEntityScanPattern(prefixes)
  return [...new Set(Array.from(text.matchAll(pattern), (m) => m[0]))]
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
