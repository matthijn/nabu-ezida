import { tool, registerTool, ok, err } from "../../executors/tool"
import { deleteJsonBlock as def } from "./def"
import {
  findSingletonBlock,
  findBlockById,
  summarizeBlocks,
  stripBlock,
  type CodeBlock,
} from "~/lib/data-blocks/parse"
import { isKnownBlockType, isSingleton, getLabelKey } from "~/lib/data-blocks/registry"
import { getFile } from "~/lib/files"

const normalizeDoubleExt = (path: string): string => path.replace(/(\.\w+)\1+$/, "$1")

interface ResolvedFile {
  content: string
  path: string
}

const resolveFile = (path: string): ResolvedFile | null => {
  const exact = getFile(path)
  if (exact !== undefined) return { content: exact, path }

  const normalized = normalizeDoubleExt(path)
  if (normalized !== path) {
    const content = getFile(normalized)
    if (content !== undefined) return { content, path: normalized }
  }

  return null
}

const isMultiBlockLanguage = (language: string): boolean =>
  isKnownBlockType(language) && !isSingleton(language)

const formatBlockList = (summaries: { id: string; label: string | undefined }[]): string =>
  summaries.map((s) => (s.label ? `  ${s.id} (${s.label})` : `  ${s.id}`)).join("\n")

type ResolvedBlock = { ok: true; block: CodeBlock } | { ok: false; error: string }

const resolveBlockForDelete = (
  content: string,
  language: string,
  blockId: string | undefined
): ResolvedBlock => {
  if (!isMultiBlockLanguage(language)) {
    const block = findSingletonBlock(content, language)
    if (!block) return { ok: false, error: `No \`${language}\` block found` }
    return { ok: true, block }
  }

  if (!blockId) {
    const summaries = summarizeBlocks(content, language, getLabelKey(language))
    if (summaries.length === 0)
      return { ok: false, error: `No \`${language}\` blocks found in this file` }
    return {
      ok: false,
      error: `block_id is required for \`${language}\`. Available blocks:\n${formatBlockList(summaries)}`,
    }
  }

  const found = findBlockById(content, language, blockId)
  if (!found) {
    const summaries = summarizeBlocks(content, language, getLabelKey(language))
    const available =
      summaries.length > 0
        ? `Available blocks:\n${formatBlockList(summaries)}`
        : `No \`${language}\` blocks found in this file`
    return { ok: false, error: `No \`${language}\` block with id "${blockId}". ${available}` }
  }

  return { ok: true, block: found.block }
}

export const deleteJsonBlock = registerTool(
  tool({
    ...def,
    handler: async (_files, { path, language, block_id }) => {
      const file = resolveFile(path)
      if (!file) return err(`${path}: No such file`)

      const resolved = resolveBlockForDelete(file.content, language, block_id)
      if (!resolved.ok) return err(`${file.path}: ${resolved.error}`)

      const newContent = stripBlock(file.content, resolved.block)
      return ok(`Deleted \`${language}\` block from ${file.path}`, [
        { type: "write_file", path: file.path, content: newContent },
      ])
    },
  })
)
