import type { Block } from "../../client"
import type { ToolResult } from "../../types"
import type { ScoutFileEntry } from "./def"
import { ScoutArgs } from "./def"
import { registerSpecialHandler } from "../../executors/delegation"
import { scoutFile, type ScoutMap } from "../scout-map"
import { getFileView } from "../file-view"
import { getFile } from "~/lib/files"
import { pushBlocks } from "../../client"
import { modeSystemBlocks } from "../../executors/modes"

const FILE_LINE_THRESHOLD = 50

const countLines = (text: string): number => text.split("\n").length

const toSystemBlock = (content: string): Block => ({ type: "system", content })

const formatScoutMap = (path: string, map: ScoutMap): string =>
  `File: ${path}\n${JSON.stringify(map, null, 2)}`

const scoutEntry = async (path: string, task: string, reason: string): Promise<Block> => {
  const content = getFileView(path)
  if (content === undefined) throw new Error(`File not viewable: ${path}`)

  const isLarge = countLines(content) > FILE_LINE_THRESHOLD

  if (!isLarge) return toSystemBlock(`File: ${path}\n${content}`)

  const map = await scoutFile(content, task, reason)
  return toSystemBlock(formatScoutMap(path, map))
}

const handleScout = async (call: { args: unknown }): Promise<ToolResult<unknown>> => {
  const parsed = ScoutArgs.safeParse(call.args)
  if (!parsed.success) return { status: "error", output: `Invalid args: ${parsed.error.message}` }

  const { task, files } = parsed.data

  const missing = files
    .filter((f: ScoutFileEntry) => getFile(f.path) === undefined)
    .map((f: ScoutFileEntry) => f.path)
  if (missing.length > 0)
    return { status: "error", output: `Files not found: ${missing.join(", ")}` }

  const fileBlocks = await Promise.all(
    files.map((f: ScoutFileEntry) => scoutEntry(f.path, task, f.reason))
  )

  pushBlocks([...fileBlocks, ...modeSystemBlocks("plan")])
  return { status: "ok", output: "ok" }
}

registerSpecialHandler("scout", handleScout)
