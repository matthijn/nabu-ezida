import type { Block } from "../../client"
import type { HandlerResult } from "../../types"
import type { FileEntry } from "../file-entry"
import type { ScoutEntry } from "../scout/api"
import { planDeepAnalysisTool, PlanDeepAnalysisArgs } from "./def"
import { registerTool, tool } from "../../executors/tool"
import { scoutFile, formatScoutEntry } from "../scout/api"
import { getFileView } from "../file-view"
import { getFile } from "~/lib/files"
import { pushBlocks, getAllBlocks } from "../../client"
import { modeSystemBlocks } from "../../executors/modes"
import { processPool } from "~/lib/utils/pool"
import { filterSections } from "../scout-filter"
import { PREFERENCES_FILE } from "~/lib/files/filename"
import { getFiles } from "~/lib/files/store"
import {
  indexSections,
  formatIndexedSections,
  mergeSourceContent,
  formatFilteredTarget,
  collectMatches,
  buildPlanInstruction,
} from "./format"

const toSystemBlock = (content: string): Block => ({ type: "system", content })

const READ_MARKER = "## READ MEMORY"
const RECENCY_THRESHOLD = 15

type ScoutResult = { ok: true; path: string; entry: ScoutEntry } | { ok: false; path: string }

const tryScout = async (file: FileEntry, forceScout: boolean): Promise<ScoutResult> => {
  try {
    const content = getFileView(file.path)
    if (content === undefined) return { ok: false, path: file.path }
    const entry = await scoutFile(file.path, content, file.reason, { forceScout })
    return { ok: true, path: file.path, entry }
  } catch {
    return { ok: false, path: file.path }
  }
}

const findMissingFiles = (files: FileEntry[]): string[] =>
  files.filter((f) => getFile(f.path) === undefined).map((f) => f.path)

const isMemoryRecent = (blocks: Block[]): boolean => {
  let actionCount = 0
  for (let i = blocks.length - 1; i >= 0; i--) {
    const block = blocks[i]
    if (block.type === "system" && block.content.includes(READ_MARKER)) return true
    if (block.type === "text" || block.type === "tool_call") actionCount++
    if (actionCount >= RECENCY_THRESHOLD) return false
  }
  return false
}

registerTool(
  tool({
    ...planDeepAnalysisTool,
    schema: PlanDeepAnalysisArgs,
    handler: async (_files, { source_files, target_files, post_action }) => {
      const allFiles = [...source_files, ...target_files]
      const missing = findMissingFiles(allFiles)
      if (missing.length > 0)
        return { status: "error", output: `Files not found: ${missing.join(", ")}`, mutations: [] }

      const sourceFailed: string[] = []
      const sourceContents: { path: string; content: string }[] = []

      await processPool(
        source_files,
        async (f) => {
          const result = await tryScout(f, false)
          if (!result.ok) {
            sourceFailed.push(result.path)
            return []
          }
          sourceContents.push({ path: result.path, content: formatScoutEntry(result.entry) })
          return [toSystemBlock(formatScoutEntry(result.entry))]
        },
        (blocks) => pushBlocks(blocks),
        { concurrency: 3 }
      )

      if (sourceFailed.length === source_files.length)
        return {
          status: "error",
          output: `All source files failed: ${sourceFailed.join(", ")}`,
          mutations: [],
        }

      const targetEntries: { path: string; entry: ScoutEntry }[] = []
      const targetFailed: string[] = []

      await processPool(
        target_files,
        async (f) => {
          const result = await tryScout(f, true)
          if (!result.ok) {
            targetFailed.push(result.path)
            return []
          }
          targetEntries.push({ path: result.path, entry: result.entry })
          return []
        },
        () => undefined,
        { concurrency: 3 }
      )

      const indexed = indexSections(targetEntries)
      const sectionsText = formatIndexedSections(indexed)

      const preferences = getFiles()[PREFERENCES_FILE] ?? null
      const merged = mergeSourceContent(sourceContents, preferences)

      const matchingIndices =
        indexed.length > 0 ? new Set(await filterSections(merged, sectionsText)) : new Set<number>()

      let globalOffset = 0
      for (const { path, entry } of targetEntries) {
        const block = toSystemBlock(
          formatFilteredTarget(path, entry, matchingIndices, globalOffset)
        )
        pushBlocks([block])
        if (entry.kind === "mapped") globalOffset += entry.map.sections.length
      }

      const blocks = getAllBlocks()
      if (!isMemoryRecent(blocks) && preferences) {
        pushBlocks([
          toSystemBlock(
            `${READ_MARKER}\n<file ${PREFERENCES_FILE}>\n${preferences}\n</file ${PREFERENCES_FILE}>`
          ),
        ])
      }

      const matches = collectMatches(targetEntries, matchingIndices)
      if (matches.length > 0) {
        const instruction = buildPlanInstruction(
          matches,
          source_files.map((f) => f.path),
          post_action
        )
        pushBlocks([toSystemBlock(instruction)])
      }

      pushBlocks(modeSystemBlocks("plan"))

      const total = target_files.length + source_files.length
      const failed = [...sourceFailed, ...targetFailed]

      if (failed.length === 0) return { status: "ok", output: "ok", mutations: [] }
      if (failed.length === total)
        return { status: "error", output: `All files failed: ${failed.join(", ")}`, mutations: [] }

      return {
        status: "partial",
        output: "ok",
        message: `${total - failed.length}/${total} files processed. Failed: ${failed.join(", ")}`,
        mutations: [],
      } as HandlerResult<string>
    },
  })
)
