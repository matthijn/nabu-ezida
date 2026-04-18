import type { Block } from "../../client"
import type { HandlerResult } from "../../types"
import type { ScoutFileEntry } from "./def"
import { scoutTool, ScoutArgs } from "./def"
import { registerTool, tool } from "../../executors/tool"
import { scoutFile, formatScoutEntry } from "./api"
import { getFileView } from "../file-view"
import { getFile } from "~/lib/files"
import { pushBlocks } from "../../client"
import { processPool } from "~/lib/utils/pool"

const toSystemBlock = (content: string): Block => ({ type: "system", content })

type ScoutEntryResult = { ok: true; block: Block } | { ok: false; path: string }

const tryScoutEntry = async (path: string, reason: string): Promise<ScoutEntryResult> => {
  try {
    const content = getFileView(path)
    if (content === undefined) return { ok: false, path }
    const entry = await scoutFile(path, content, reason)
    return { ok: true, block: toSystemBlock(formatScoutEntry(entry)) }
  } catch {
    return { ok: false, path }
  }
}

const toResult = (total: number, failed: string[]): HandlerResult<string> => {
  if (failed.length === 0) return { status: "ok", output: "ok", mutations: [] }

  const successCount = total - failed.length
  const failedList = failed.join(", ")

  if (successCount === 0)
    return { status: "error", output: `All files failed to map: ${failedList}`, mutations: [] }

  return {
    status: "partial",
    output: "ok",
    message: `${successCount}/${total} files mapped. Failed: ${failedList}`,
    mutations: [],
  }
}

registerTool(
  tool({
    ...scoutTool,
    schema: ScoutArgs,
    handler: async (_files, { files }) => {
      const missing = files
        .filter((f: ScoutFileEntry) => getFile(f.path) === undefined)
        .map((f: ScoutFileEntry) => f.path)
      if (missing.length > 0)
        return { status: "error", output: `Files not found: ${missing.join(", ")}`, mutations: [] }

      const failed: string[] = []

      await processPool(
        files,
        async (f: ScoutFileEntry) => {
          const result = await tryScoutEntry(f.path, f.reason)
          if (!result.ok) {
            failed.push(result.path)
            return []
          }
          return [result.block]
        },
        (blocks) => pushBlocks(blocks),
        { concurrency: 3 }
      )

      return toResult(files.length, failed)
    },
  })
)
