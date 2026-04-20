import type { HydeQuery } from "./semantic"

const groupByLanguage = (hydes: HydeQuery[]): Map<string, HydeQuery[]> => {
  const map = new Map<string, HydeQuery[]>()
  for (const hyde of hydes) {
    const existing = map.get(hyde.language) ?? []
    existing.push(hyde)
    map.set(hyde.language, existing)
  }
  return map
}

const formatLanguageHeader = (language: string): string => `━━━ ${language.toUpperCase()} ━━━`

const formatLanguageBlock = (language: string, hydes: HydeQuery[]): string => {
  const lines = hydes.map((h, i) => `  ${i + 1}. ${h.text}`).join("\n")
  return `${formatLanguageHeader(language)}\n${lines}`
}

export const formatHydeDebug = (hydes: HydeQuery[]): string => {
  const byLanguage = groupByLanguage(hydes)
  return [...byLanguage.entries()]
    .map(([language, langHydes]) => formatLanguageBlock(language, langHydes))
    .join("\n\n")
}
