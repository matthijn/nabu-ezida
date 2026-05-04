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

export const buildExecRules = (firstStepCall: string): string =>
  `Your only action: call the tool below. No other tool calls. No reasoning about the tool call. Execute.
   
   ${firstStepCall}`

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
})

const SYNTHESIS_STEP: StepDefObject = {
  title: "Relate to Research Questions",
  expected: `
    You have received annotations from blind coding, a codebook, and research questions.

    Write a short synthesis connecting this document's coding to the research questions. Do not summarize the coding itself — the researcher already has that view.
    
    For each research question: state what relevant coded material exists or that none does. Where a passage might seem relevant to a RQ but the coding tells a different story, say so. Note code co-occurrences or tensions only where they matter for a specific RQ.
    
    Note any significant absences — codes or code categories from the codebook that were not applied, where that absence is informative for the research questions.
    
    Reference specific annotations by their ID to anchor observations. Do not describe passages in prose or quote source text — the IDs are clickable and expand to show the full content. One or two IDs per observation, not more.
    
    Rules:
    
    Describe this document's coding only. Do not make claims about other documents or later periods.
    Do not evaluate the document's importance relative to the corpus. No superlatives — you have not seen other documents.
    If a RQ concerns a process spanning multiple documents, state what this document contains that is relevant — not what the process is or whether it occurred.
    No speculative interpretation. "These codes co-occur" is good. "This shows the birth of a constraint" is not.
    Do not narrate trajectory. This document is not the beginning, middle, or end of anything — you cannot see the sequence. No phrases like "early seeds," "already crystallizing," "at this stage," or "potential mechanisms."
    Use plain descriptive language. No line numbers.
    150-250 words. No markdown headings or tables. Bold to highlight RQ references. Use IDs to reference annotations and codes.
  `,
  checkpoint: false,
}
