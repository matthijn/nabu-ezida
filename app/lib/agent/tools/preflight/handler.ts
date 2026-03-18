import type { Block } from "../../client"
import type { ToolResult } from "../../types"
import type { PreflightFileEntry } from "./def"
import { PreflightArgs } from "./def"
import { registerSpecialHandler } from "../../executors/delegation"
import { segmentContent, type SegmentResult } from "../segment-file"
import { readFileContent } from "../file-content"
import { getFile } from "~/lib/files"
import { pushBlocks } from "../../client"
import { modeSystemBlocks } from "../../executors/modes"

const FILE_LINE_THRESHOLD = 50

type FileEntry = PreflightFileEntry & { prose: string; lines: number }

const countLines = (text: string): number => text.split("\n").length

const readEntry = (entry: PreflightFileEntry): FileEntry => {
  const prose = readFileContent(entry.path)
  return { ...entry, prose: prose ?? "", lines: prose ? countLines(prose) : 0 }
}

const isLarge = (entry: FileEntry): boolean => entry.lines > FILE_LINE_THRESHOLD

const segmentEntry = async (entry: FileEntry): Promise<SegmentResult> =>
  segmentContent(entry.prose, `Segment this document for: ${entry.reason}`)

const formatManifest = (entry: FileEntry, result: SegmentResult): string =>
  `File: ${entry.path}\n${JSON.stringify(result, null, 2)}`

const toSystemBlock = (content: string): Block => ({ type: "system", content })

const buildFileBlocks = async (entries: FileEntry[]): Promise<Block[]> => {
  const large = entries.filter(isLarge)
  const small = entries.filter((e) => !isLarge(e))

  const segmented = await Promise.all(
    large.map(async (entry) => toSystemBlock(formatManifest(entry, await segmentEntry(entry))))
  )
  const inlined = small.map((entry) => toSystemBlock(`File: ${entry.path}\n${entry.prose}`))

  return [...segmented, ...inlined]
}

const handlePreflight = async (call: { args: unknown }): Promise<ToolResult<unknown>> => {
  const parsed = PreflightArgs.safeParse(call.args)
  if (!parsed.success) return { status: "error", output: `Invalid args: ${parsed.error.message}` }

  const { files } = parsed.data

  const missing = files.filter((f) => getFile(f.path) === undefined).map((f) => f.path)
  if (missing.length > 0)
    return { status: "error", output: `Files not found: ${missing.join(", ")}` }

  const entries = files.map(readEntry)

  const fileBlocks = await buildFileBlocks(entries)

  pushBlocks([...fileBlocks, ...modeSystemBlocks("plan")])
  return { status: "ok", output: "ok" }
}

registerSpecialHandler("preflight", handlePreflight)
