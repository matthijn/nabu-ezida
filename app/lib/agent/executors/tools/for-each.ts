import type { Block, BlockOrigin, ToolResult } from "../../types"
import { ForEachArgs } from "./for-each.def"
import { registerDelegationHandler, startBranch, siblingKey, formatBranchContext, formatCompactContext } from "../delegation"
import type { BranchResult } from "../delegation"
import { agents } from "../agents"
import { getBlocksForInstances } from "../../block-store"
import { getFileRaw, getStoredAnnotations } from "~/lib/files"
import { filterMatchingAnnotations } from "~/domain/attributes/annotations"
import { stripAttributesBlock } from "~/lib/text/markdown"

const readFileChunk = (file: string): string => {
  const raw = getFileRaw(file)
  return raw ? stripAttributesBlock(raw) : ""
}

const readFileAnnotations = (file: string): string => {
  const raw = getFileRaw(file)
  if (!raw) return ""
  const prose = stripAttributesBlock(raw)
  const annotations = filterMatchingAnnotations(getStoredAnnotations(raw), prose)
  if (annotations.length === 0) return ""
  return JSON.stringify(annotations)
}

const executeForEach = async (call: { args: unknown }, origin?: BlockOrigin): Promise<ToolResult<unknown>> => {
  const parsed = ForEachArgs.safeParse(call.args)
  if (!parsed.success) return { status: "error", output: `Invalid args: ${parsed.error.message}` }

  if (!origin) return { status: "error", output: "for_each requires an origin" }

  const { files, task } = parsed.data
  const compactKey = siblingKey(origin.agent, "compact")

  if (!agents[compactKey]) {
    return { status: "error", output: `Missing compact agent for: ${origin.agent}` }
  }

  const frozenBlocks: Block[] = getBlocksForInstances([origin.instance])
  const results: BranchResult[] = []

  for (const file of files) {
    const content = readFileChunk(file)
    if (!content) {
      results.push({ file, result: { status: "error", output: `File not found or empty: ${file}` } })
      continue
    }
    const annotations = readFileAnnotations(file)
    const context = formatBranchContext(task, file, content, annotations, results)
    const result = await startBranch(origin.agent, frozenBlocks, context)
    results.push({ file, result })
  }

  const compactContext = formatCompactContext(task, results)
  return startBranch(compactKey, frozenBlocks, compactContext)
}

registerDelegationHandler("for_each", executeForEach)
