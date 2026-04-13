import type { Block } from "../../client"
import type { ToolResult } from "../../types"
import type { ScoutFileEntry } from "./def"
import { ScoutArgs } from "./def"
import { registerSpecialHandler } from "../../executors/delegation"
import { scoutFile, type ScoutMap } from "../scout-map"
import { getFileView } from "../file-view"
import { getFile } from "~/lib/files"
import { pushBlocks } from "../../client"
import { processPool } from "~/lib/utils/pool"

const FILE_LINE_THRESHOLD = 50

const countLines = (text: string): number => text.split("\n").length

const toSystemBlock = (content: string): Block => ({ type: "system", content })

const formatScoutMap = (path: string, map: ScoutMap): string =>
  `File: ${path}\n${JSON.stringify(map, null, 2)}`

type ScoutEntryResult = { ok: true; block: Block } | { ok: false; path: string }

const tryScoutEntry = async (
  path: string,
  task: string,
  reason: string
): Promise<ScoutEntryResult> => {
  try {
    const content = getFileView(path)
    if (content === undefined) return { ok: false, path }

    const isLarge = countLines(content) > FILE_LINE_THRESHOLD
    const block = isLarge
      ? toSystemBlock(formatScoutMap(path, await scoutFile(content, task, reason)))
      : toSystemBlock(`File: ${path}\n${content}`)

    return { ok: true, block }
  } catch {
    return { ok: false, path }
  }
}

const toScoutResult = (total: number, failed: string[]): ToolResult<unknown> => {
  if (failed.length === 0) return { status: "ok", output: "ok" }

  const successCount = total - failed.length
  const failedList = failed.join(", ")

  if (successCount === 0)
    return { status: "error", output: `All files failed to map: ${failedList}` }

  return {
    status: "partial",
    output: "ok",
    message: `${successCount}/${total} files mapped. Failed: ${failedList}`,
  }
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

  const failed: string[] = []

  await processPool(
    files,
    async (f: ScoutFileEntry) => {
      const result = await tryScoutEntry(f.path, task, f.reason)
      if (!result.ok) {
        failed.push(result.path)
        return []
      }
      return [result.block]
    },
    (blocks) => pushBlocks(blocks),
    { concurrency: 3 }
  )

  return toScoutResult(files.length, failed)
}

registerSpecialHandler("scout", handleScout)
