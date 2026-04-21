import type { ScoutMap, ScoutSection, SectionLabel } from "../scout-map"
import { labelSection } from "../scout-map"
import { chunkLines, type LineChunk } from "~/lib/data-blocks/chunk-lines"
import { processPool } from "~/lib/utils/pool"
import { presentContent, extractLines, formatScoutMap } from "./prose"

export type ScoutEntry =
  | { kind: "inline"; path: string; content: string }
  | { kind: "mapped"; path: string; map: ScoutMap }

const TARGET_CHUNK_SIZE = 8000

const PROSE_LINE_THRESHOLD = 50

const countLines = (text: string): number => text.split("\n").length

export interface ScoutOptions {
  forceScout?: boolean
}

const toSection = (chunk: LineChunk, label: SectionLabel): ScoutSection => ({
  label: label.label,
  start_line: chunk.startLine,
  end_line: chunk.endLine,
  desc: label.desc,
  keywords: label.keywords,
})

interface IndexedChunk {
  index: number
  chunk: LineChunk
}

const labelChunk = async (content: string, chunk: LineChunk): Promise<ScoutSection> => {
  const slice = extractLines(content, chunk.startLine, chunk.endLine)
  const presented = presentContent(slice)
  const label = await labelSection(presented)
  return toSection(chunk, label)
}

interface IndexedSection {
  index: number
  section: ScoutSection
}

const byIndex = (a: IndexedSection, b: IndexedSection): number => a.index - b.index

const charsToTokens = (chars: number): number => Math.round(chars / 4)

export const scoutFile = async (
  path: string,
  content: string,
  options?: ScoutOptions
): Promise<ScoutEntry> => {
  if (!options?.forceScout && countLines(content) <= PROSE_LINE_THRESHOLD) {
    return { kind: "inline", path, content }
  }

  const chunks = chunkLines(content, TARGET_CHUNK_SIZE)

  if (chunks.length === 0) {
    return { kind: "inline", path, content }
  }

  const indexed: IndexedChunk[] = chunks.map((chunk, index) => ({ index, chunk }))
  const chunkLengths = chunks.map((c) =>
    charsToTokens(extractLines(content, c.startLine, c.endLine).length)
  )
  console.debug(`[scout] ${path} chunked in tokens [${chunkLengths.join(", ")}]`)

  const { results } = await processPool(
    indexed,
    async ({ index, chunk }) => [{ index, section: await labelChunk(content, chunk) }],
    () => undefined,
    { concurrency: 10, warmup: 1 }
  )

  const sections = (results as IndexedSection[]).sort(byIndex).map((r) => r.section)

  return { kind: "mapped", path, map: { sections } }
}

export const formatScoutEntry = (entry: ScoutEntry): string => {
  switch (entry.kind) {
    case "inline":
      return `File: ${entry.path}\n${entry.content}`
    case "mapped":
      return formatScoutMap(entry.path, entry.map)
    default:
      throw new Error(`unknown scout entry kind: ${(entry as ScoutEntry).kind}`)
  }
}
