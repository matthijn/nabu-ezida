import type { ToolResult } from "../../types"
import type { TriageFileEntry } from "./triage.def"
import { TriageArgs } from "./triage.def"
import { registerSpecialHandler } from "../delegation"
import { segmentContent, type SegmentResult } from "./segment-file"
import { readFileContent } from "./file-content"
import { pushBlocks } from "../../block-store"
import { modeSystemBlocks } from "../modes"

const TOTAL_LINE_THRESHOLD = 150
const FILE_LINE_THRESHOLD = 50

type FileEntry = TriageFileEntry & { prose: string; lines: number }

type SegmentedManifest = { file: string; reason: string; toc: SegmentResult["sections"]; file_context: string }
type InlineManifest = { file: string; reason: string; content: string }
type Manifest = SegmentedManifest | InlineManifest

type TriageResult =
  | { plan_needed: false }
  | { plan_needed: true; manifests: Manifest[] }

const countLines = (text: string): number =>
  text.split("\n").length

const readEntry = (entry: TriageFileEntry): FileEntry => {
  const prose = readFileContent(entry.path)
  return { ...entry, prose: prose ?? "", lines: prose ? countLines(prose) : 0 }
}

const isLarge = (entry: FileEntry): boolean =>
  entry.lines > FILE_LINE_THRESHOLD

const segmentEntry = async (entry: FileEntry): Promise<SegmentedManifest> => {
  const result = await segmentContent(
    entry.prose,
    `Segment this document for: ${entry.reason}`,
  )
  return { file: entry.path, reason: entry.reason, toc: result.sections, file_context: result.file_context }
}

const inlineEntry = (entry: FileEntry): InlineManifest => ({
  file: entry.path, reason: entry.reason, content: entry.prose,
})

const executeTriage = async (entries: FileEntry[]): Promise<TriageResult> => {
  const large = entries.filter(isLarge)
  const small = entries.filter((e) => !isLarge(e))

  const segmented = await Promise.all(large.map(segmentEntry))
  const manifests: Manifest[] = [...segmented, ...small.map(inlineEntry)]
  return { plan_needed: true, manifests }
}

const formatTriageOutput = (result: TriageResult): string => {
  if (!result.plan_needed) return "No plan needed — handle directly."
  return `File manifests:\n${JSON.stringify(result.manifests, null, 2)}`
}

const handleTriage = async (call: { args: unknown }): Promise<ToolResult<unknown>> => {
  const parsed = TriageArgs.safeParse(call.args)
  if (!parsed.success) return { status: "error", output: `Invalid args: ${parsed.error.message}` }

  const { files } = parsed.data
  const entries = files.map(readEntry)
  const totalLines = entries.reduce((sum, e) => sum + e.lines, 0)

  if (totalLines <= TOTAL_LINE_THRESHOLD) {
    return { status: "ok", output: formatTriageOutput({ plan_needed: false }) }
  }

  const result = await executeTriage(entries)
  pushBlocks(modeSystemBlocks("plan"))
  return { status: "ok", output: formatTriageOutput(result) }
}

registerSpecialHandler("triage", handleTriage)
