import type { EmbeddingEntry } from "./diff"
import { findBlocksByLanguage } from "~/lib/data-blocks/parse"

const COMPANION_SUFFIX = ".embeddings.hidden.md"
const MD_EXTENSION = ".md"
const LANGUAGE = "json-embeddings"

export const companionFilename = (source: string): string =>
  source.replace(/\.md$/, COMPANION_SUFFIX)

export const sourceFilename = (companion: string): string =>
  companion.replace(/\.embeddings\.hidden\.md$/, MD_EXTENSION)

export const isCompanionFile = (filename: string): boolean => filename.endsWith(COMPANION_SUFFIX)

const entryToBlock = (entry: EmbeddingEntry): string =>
  `\`\`\`${LANGUAGE}\n${JSON.stringify(entry)}\n\`\`\``

export const buildCompanionMarkdown = (entries: EmbeddingEntry[]): string =>
  entries.map(entryToBlock).join("\n\n")

const parseEntry = (content: string): EmbeddingEntry | null => {
  try {
    const parsed = JSON.parse(content)
    if (typeof parsed.hash !== "string" || typeof parsed.text !== "string") return null
    if (!Array.isArray(parsed.embedding)) return null
    return parsed as EmbeddingEntry
  } catch {
    return null
  }
}

export const parseCompanionEntries = (markdown: string): EmbeddingEntry[] =>
  findBlocksByLanguage(markdown, LANGUAGE)
    .map((block) => parseEntry(block.content))
    .filter((e): e is EmbeddingEntry => e !== null)
