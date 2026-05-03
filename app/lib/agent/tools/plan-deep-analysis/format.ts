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
  title: "Synthesize findings",
  expected: `
    You will receive annotations from blind coding, a codebook, and research questions.
    Write a short synthesis of this document's coding. Do not list code frequencies or catalogue annotations — the researcher already has that view. Instead focus on:
    
    How codes interact: co-occurrences on the same passages, tensions between codes, clusters that form a pattern.
    What's absent: codes or code categories from the codebook that are not applied, particularly where their absence is informative.
    For each research question: a brief statement of what relevant material exists or that none does. Where a passage might seem relevant to a RQ but the coding tells a different story, say so.
    
    Reference annotations by ID only to anchor specific observations — not to enumerate what was found. One or two references per point, not five.
    Rules:
    
    Describe this document's coding only. Do not make claims about other documents or later periods.
    Do not evaluate the document's importance relative to the corpus.
    If a RQ concerns a process spanning multiple documents, state what this document contains that is relevant — not what the process is or whether it occurred.
    No speculative interpretation. "These codes co-occur" is good. "This shows the birth of a constraint" is not.
    A few paragraphs.

    Report and stop. Make no tool calls. No markdown headings or tables. Only bold to highlight RQ questions`,
  checkpoint: false,
}
