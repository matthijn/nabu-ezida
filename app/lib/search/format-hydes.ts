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

const groupTextsByGroup = (hydes: HydeQuery[]): Map<string, string[]> => {
  const map = new Map<string, string[]>()
  for (const hyde of hydes) {
    const existing = map.get(hyde.group) ?? []
    existing.push(hyde.text)
    map.set(hyde.group, existing)
  }
  return map
}

const formatGroupBlock = (group: string, texts: string[]): string => {
  const lines = texts.map((text, i) => `    ${i + 1}. ${text}`).join("\n")
  return `  ${group}\n${lines}`
}

const formatLanguageHeader = (language: string): string => `━━━ ${language.toUpperCase()} ━━━`

const formatLanguageBlock = (language: string, hydes: HydeQuery[]): string => {
  const groups = groupTextsByGroup(hydes)
  const blocks = [...groups.entries()].map(([group, texts]) => formatGroupBlock(group, texts))
  return `${formatLanguageHeader(language)}\n${blocks.join("\n\n")}`
}

export const formatHydeDebug = (hydes: HydeQuery[]): string => {
  const byLanguage = groupByLanguage(hydes)
  return [...byLanguage.entries()]
    .map(([language, langHydes]) => formatLanguageBlock(language, langHydes))
    .join("\n\n")
}
