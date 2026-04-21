import { parseCodeBlocks, parseBlockJson } from "~/lib/data-blocks/parse"
import { findFileForId } from "./pending-refs"
import { getFilesStripped } from "./store"

const HIDDEN_SUFFIX = ".hidden.md"

const parseHiddenId = (path: string): string | null =>
  path.endsWith(HIDDEN_SUFFIX) ? path.slice(0, -HIDDEN_SUFFIX.length) : null

export const resolveHiddenFile = (path: string): string | undefined => {
  const id = parseHiddenId(path)
  if (!id) return undefined

  const filename = findFileForId(id)
  if (!filename) return undefined

  const content = getFilesStripped()[filename]
  if (!content) return undefined

  for (const block of parseCodeBlocks(content)) {
    const parsed = parseBlockJson(block)
    if (!parsed.ok) continue
    const data = parsed.data as Record<string, unknown>
    if (data.id === id) return "```json\n" + JSON.stringify(data, null, 2) + "\n```"
  }

  return undefined
}
