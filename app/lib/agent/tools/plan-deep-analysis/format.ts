import type { ScoutEntry } from "../scout/api"
import { formatSection } from "../scout/prose"

export const formatTarget = (path: string, entry: ScoutEntry): string => {
  if (entry.kind !== "mapped") return `File: ${path}\n${(entry as { content: string }).content}`

  const header = `File: ${path}`
  const body = entry.map.sections.map(formatSection).join("\n\n")
  return `${header}\n\n${body}`
}

export interface SectionMatch {
  path: string
  label: string
  startLine: number
  endLine: number
}

export interface SourceEntry {
  path: string
  scope: string
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

const formatSourceArg = (sources: SourceEntry[]): string =>
  `[${sources.map((s) => `{path: "${s.path}", scope: "${s.scope}"}`).join(", ")}]`

const formatStep = (
  index: number,
  m: SectionMatch,
  sources: SourceEntry[],
  postAction: string
): string =>
  [
    `Step ${index}: "${m.label}"`,
    `Actions: \`apply_deep_analysis(path="${m.path}", start_line=${m.startLine}, end_line=${m.endLine}, source_files=${formatSourceArg(sources)}, post_action="${postAction}")\``,
  ].join("\n")

const formatSourceLine = (s: SourceEntry): string => `- ${s.path} (${s.scope})`

export const buildPlanInstruction = (
  matches: SectionMatch[],
  sources: SourceEntry[],
  postAction: string
): string => {
  const sourceList = sources.map(formatSourceLine).join("\n")
  const steps = matches.map((m, i) => formatStep(i + 1, m, sources, postAction)).join("\n\n")
  return [
    "# Deep analysis plan",
    "",
    "## Sources",
    sourceList,
    "",
    "## Steps",
    steps,
    "",
    "## Final step",
    "Synthesize findings against the user's research question — what was found, what was ambiguous, what was absent.",
    "",
    "---",
    "",
    "## Execution rules",
    "- One step per matching section. Each step applies the source criteria to that section.",
    "- Every step MUST call apply_deep_analysis. Do not skip or merge steps.",
    "- Do NOT re-read source files — work from the plan above.",
    "- Check user preferences and message for feedback cadence before submitting. If unspecified, ask before starting. If specified, just run.",
  ].join("\n")
}
