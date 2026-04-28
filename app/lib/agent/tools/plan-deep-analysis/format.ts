import type { ScoutEntry } from "../scout/api"
import { formatSection } from "../scout/prose"

export const formatTarget = (path: string, entry: ScoutEntry): string => {
  if (entry.kind !== "mapped") return `File: ${path}\n${(entry as { content: string }).content}`

  const header = `File: ${path}`
  const body = entry.map.sections.map(formatSection).join("\n\n")
  return `${header}\n\n${body}`
}

interface SectionMatch {
  path: string
  label: string
  startLine: number
  endLine: number
}

export const collectSections = (entries: { path: string; entry: ScoutEntry }[]): SectionMatch[] =>
  entries.flatMap(({ path, entry }) => {
    if (entry.kind !== "mapped") return []
    return entry.map.sections.map((section) => ({
      path,
      label: section.label,
      startLine: section.start_line,
      endLine: section.end_line,
    }))
  })

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
    "You MUST use apply_deep_analysis in each step",
  ].join("\n")
}
