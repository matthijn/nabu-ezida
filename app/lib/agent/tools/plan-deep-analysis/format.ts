import type { ScoutEntry } from "../scout/api"
import type { StepDefObject } from "../../derived"
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

export const buildAutoSteps = (
  matches: SectionMatch[],
  sources: SourceEntry[],
  postAction: string
): StepDefObject[] => [
  ...matches.map((m) => toAnalysisStep(m, sources, postAction)),
  SYNTHESIS_STEP,
]

export const EXEC_RULES =
  "Do NOT re-read source files. Do NOT skip or merge steps. Check user preferences for feedback cadence before starting."

const formatSourceArg = (sources: SourceEntry[]): string =>
  `[${sources.map((s) => `{path: "${s.path}", scope: "${s.scope}"}`).join(", ")}]`

const toAnalysisStep = (
  m: SectionMatch,
  sources: SourceEntry[],
  postAction: string
): StepDefObject => ({
  title: m.label,
  expected: `apply_deep_analysis(path="${m.path}", start_line=${m.startLine}, end_line=${m.endLine}, source_files=${formatSourceArg(sources)}, post_action="${postAction}")`,
  checkpoint: false,
  call: {
    name: "apply_deep_analysis",
    args: {
      path: m.path,
      start_line: m.startLine,
      end_line: m.endLine,
      source_files: sources.map((s) => ({ path: s.path, scope: s.scope })),
      post_action: postAction,
    },
  },
})

const SYNTHESIS_STEP: StepDefObject = {
  title: "Synthesize findings",
  expected:
    "Plan complete. Report: codes found with counts, key passages cited, co-occurrences, distribution across the document, speaker attribution if applicable, review flags, and codes with zero matches. Map to sub-questions where possible. Do not interpret what findings mean or theorize about connections. Report and stop. Make no tool calls.",
  checkpoint: false,
}
