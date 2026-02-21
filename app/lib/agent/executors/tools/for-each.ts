import type { Block, ToolResult } from "../../types"
import { ForEachArgs } from "./for-each.def"
import { registerSpecialHandler } from "../delegation"
import { pushBlocks } from "../../block-store"
import { getFileRaw, getStoredAnnotations } from "~/lib/files"
import { filterMatchingAnnotations } from "~/domain/attributes/annotations"
import { stripAttributesBlock } from "~/lib/text/markdown"

const readFileContent = (file: string): string =>
  stripAttributesBlock(getFileRaw(file) ?? "")

const readFileAnnotations = (file: string): string => {
  const raw = getFileRaw(file)
  if (!raw) return ""
  const prose = stripAttributesBlock(raw)
  const annotations = filterMatchingAnnotations(getStoredAnnotations(raw), prose)
  return annotations.length === 0 ? "" : JSON.stringify(annotations)
}

const formatFileSection = (file: string, content: string, annotations: string): string =>
  [
    `## File: ${file}`,
    content,
    annotations && `### Annotations\n${annotations}`,
  ].filter(Boolean).join("\n\n")

const executeForEach = async (call: { args: unknown }): Promise<ToolResult<unknown>> => {
  const parsed = ForEachArgs.safeParse(call.args)
  if (!parsed.success) return { status: "error", output: `Invalid args: ${parsed.error.message}` }

  const { files, task } = parsed.data

  const sections = files.map((file) => {
    const content = readFileContent(file)
    if (!content) return `## File: ${file}\n(empty or not found)`
    const annotations = readFileAnnotations(file)
    return formatFileSection(file, content, annotations)
  })

  const systemContent = [
    `# For Each: ${task}`,
    ...sections,
  ].join("\n\n")

  const systemBlock: Block = { type: "system", content: systemContent }
  pushBlocks([systemBlock])
  return { status: "ok", output: `Loaded ${files.length} files into context. Process them sequentially.` }
}

registerSpecialHandler("for_each", executeForEach)
