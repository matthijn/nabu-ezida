import type { EmbeddingEntry } from "./diff"
import { findSingletonBlock } from "~/lib/data-blocks/parse"

const COMPANION_SUFFIX = ".embeddings.hidden.md"
const MD_EXTENSION = ".md"
const LANGUAGE = "json-embeddings"

export const companionFilename = (source: string): string =>
  source.replace(/\.md$/, COMPANION_SUFFIX)

export const sourceFilename = (companion: string): string =>
  companion.replace(/\.embeddings\.hidden\.md$/, MD_EXTENSION)

export const isCompanionFile = (filename: string): boolean => filename.endsWith(COMPANION_SUFFIX)

export const buildCompanionMarkdown = (source: string, entries: EmbeddingEntry[]): string => {
  const block = { source, chunks: entries }
  return `\`\`\`${LANGUAGE}\n${JSON.stringify(block)}\n\`\`\``
}

export const parseCompanionEntries = (markdown: string): EmbeddingEntry[] => {
  const block = findSingletonBlock(markdown, LANGUAGE)
  if (!block) return []

  try {
    const parsed = JSON.parse(block.content)
    if (!Array.isArray(parsed.chunks)) return []
    return parsed.chunks as EmbeddingEntry[]
  } catch {
    return []
  }
}
