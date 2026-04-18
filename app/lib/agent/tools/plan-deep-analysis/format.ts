import type { ScoutSection } from "../scout-map"
import type { ScoutEntry } from "../scout/api"
import { formatSection } from "../scout/prose"

export interface IndexedSection {
  globalIndex: number
  path: string
  section: ScoutSection
}

export const indexSections = (entries: { path: string; entry: ScoutEntry }[]): IndexedSection[] => {
  let index = 0
  return entries.flatMap(({ path, entry }) => {
    if (entry.kind !== "mapped") return []
    return entry.map.sections.map((section) => ({
      globalIndex: index++,
      path,
      section,
    }))
  })
}

export const formatIndexedSections = (indexed: IndexedSection[]): string =>
  indexed
    .map(
      (s) => `[${s.globalIndex}] ${s.path}: ${s.section.label} (${s.section.keywords.join(", ")})`
    )
    .join("\n")

export const mergeSourceContent = (
  contents: { path: string; content: string }[],
  preferences: string | null
): string => {
  const sorted = [...contents].sort((a, b) => a.path.localeCompare(b.path))
  const parts = sorted.map((c) => c.content)
  if (preferences) parts.push(preferences)
  return parts.join("\n\n")
}

export const formatFilteredTarget = (
  path: string,
  entry: ScoutEntry,
  matchingGlobalIndices: Set<number>,
  globalOffset: number
): string => {
  if (entry.kind !== "mapped") return `File: ${path}\n${(entry as { content: string }).content}`

  const matchingSections = entry.map.sections.filter((_, i) =>
    matchingGlobalIndices.has(globalOffset + i)
  )

  if (matchingSections.length === 0) return `File: ${path}\n(skip)`

  const header = `File: ${path}\n${entry.map.file_context}`
  const body = matchingSections.map(formatSection).join("\n\n")
  return `${header}\n\n${body}`
}

interface SectionMatch {
  path: string
  label: string
  startLine: number
  endLine: number
}

export const collectMatches = (
  entries: { path: string; entry: ScoutEntry }[],
  matchingGlobalIndices: Set<number>
): SectionMatch[] => {
  let offset = 0
  return entries.flatMap(({ path, entry }) => {
    if (entry.kind !== "mapped") return []
    const matches = entry.map.sections.flatMap((section, i) =>
      matchingGlobalIndices.has(offset + i)
        ? [{ path, label: section.label, startLine: section.start_line, endLine: section.end_line }]
        : []
    )
    offset += entry.map.sections.length
    return matches
  })
}

const formatMatchLine = (m: SectionMatch, postAction: string): string =>
  `- apply_deep_analysis: "${m.label}" in ${m.path} [${m.startLine}-${m.endLine}] post_action=${postAction}`

export const buildPlanInstruction = (
  matches: SectionMatch[],
  sourcePaths: string[],
  postAction: string
): string => {
  const sourceList = sourcePaths.map((p) => `- ${p}`).join("\n")
  const matchLines = matches.map((m) => formatMatchLine(m, postAction)).join("\n")
  return [
    "# Deep analysis plan",
    "",
    "## Sources",
    sourceList,
    "",
    "## Sections to analyze",
    matchLines,
    "",
    "Create a plan with one step per matching section. Each step applies the source criteria to that section.",
    "Feedback cadence is required before submitting — check preferences and the user's message first; if unresolved, ask. Otherwise just submit.",
  ].join("\n")
}
