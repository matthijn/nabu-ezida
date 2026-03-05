import type { Block, ToolResult } from "../../types"
import type { PreflightFileEntry } from "./preflight.def"
import { PreflightArgs } from "./preflight.def"
import { registerSpecialHandler } from "../delegation"
import { segmentContent, type SegmentResult } from "./segment-file"
import { readFileContent } from "./file-content"
import { getFile } from "~/lib/files"
import { approaches } from "~/domain/approaches"
import { pushBlocks } from "../../block-store"
import { modeSystemBlocks } from "../modes"

const FILE_LINE_THRESHOLD = 50

type FileEntry = PreflightFileEntry & { prose: string; lines: number }

const countLines = (text: string): number =>
  text.split("\n").length

const readEntry = (entry: PreflightFileEntry): FileEntry => {
  const prose = readFileContent(entry.path)
  return { ...entry, prose: prose ?? "", lines: prose ? countLines(prose) : 0 }
}

const isLarge = (entry: FileEntry): boolean =>
  entry.lines > FILE_LINE_THRESHOLD

const segmentEntry = async (entry: FileEntry): Promise<SegmentResult> =>
  segmentContent(entry.prose, `Segment this document for: ${entry.reason}`)

const formatManifest = (entry: FileEntry, result: SegmentResult): string =>
  `File: ${entry.path}\n${JSON.stringify(result, null, 2)}`

const toSystemBlock = (content: string): Block =>
  ({ type: "system", content })

const buildFileBlocks = async (entries: FileEntry[]): Promise<Block[]> => {
  const large = entries.filter(isLarge)
  const small = entries.filter((e) => !isLarge(e))

  const segmented = await Promise.all(
    large.map(async (entry) => toSystemBlock(formatManifest(entry, await segmentEntry(entry))))
  )
  const inlined = small.map((entry) => toSystemBlock(`File: ${entry.path}\n${entry.prose}`))

  return [...segmented, ...inlined]
}

const parentIndexKeys = (key: string): string[] => {
  const parts = key.split("/")
  const keys: string[] = []
  for (let i = 1; i < parts.length; i++) {
    keys.push(parts.slice(0, i).join("/") + "/index")
  }
  return keys
}

const collectIndexKeys = (keys: readonly string[]): string[] => {
  const all = new Set<string>(["index"])
  for (const key of keys) {
    for (const idx of parentIndexKeys(key)) all.add(idx)
  }
  return [...all].sort()
}

export const resolveApproaches = (keys: readonly string[], dict: Record<string, string>): string[] => {
  const indexKeys = collectIndexKeys(keys)
  const selectedKeys = [...keys].sort()
  const ordered = [...indexKeys, ...selectedKeys]
  const seen = new Set<string>()
  return ordered.reduce<string[]>((acc, key) => {
    if (seen.has(key)) return acc
    seen.add(key)
    const content = dict[key]
    if (content) acc.push(content)
    return acc
  }, [])
}

const buildApproachBlocks = (keys: readonly string[]): Block[] =>
  resolveApproaches(keys, approaches).map(toSystemBlock)

const handlePreflight = async (call: { args: unknown }): Promise<ToolResult<unknown>> => {
  const parsed = PreflightArgs.safeParse(call.args)
  if (!parsed.success) return { status: "error", output: `Invalid args: ${parsed.error.message}` }

  const { files, approaches: approachKeys } = parsed.data

  const missing = files.filter((f) => getFile(f.path) === undefined).map((f) => f.path)
  if (missing.length > 0) return { status: "error", output: `Files not found: ${missing.join(", ")}` }

  const entries = files.map(readEntry)

  const fileBlocks = await buildFileBlocks(entries)
  const approachBlocks = buildApproachBlocks(approachKeys)

  pushBlocks([...fileBlocks, ...approachBlocks, ...modeSystemBlocks("plan")])
  return { status: "ok", output: "ok" }
}

registerSpecialHandler("preflight", handlePreflight)
