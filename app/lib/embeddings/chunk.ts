import { hashChunk } from "./hash"
import { TARGET_CHUNK_SIZE, MIN_CHUNK_SIZE, CHUNK_OVERLAP_RATIO } from "./constants"
import { splitByParagraphs } from "~/lib/text/split"
import { chunk as chunkSegments } from "~/lib/text/chunk"

export interface Chunk {
  index: number
  text: string
  hash: string
}

const isHeading = (text: string): boolean => text.trimStart().startsWith("#")

const tailSlice = (text: string, ratio: number): string => {
  const len = Math.floor(text.length * ratio)
  if (len === 0) return ""
  const start = text.length - len
  const spaceIdx = text.indexOf(" ", start)
  const breakAt = spaceIdx !== -1 && spaceIdx - start < len * 0.2 ? spaceIdx + 1 : start
  return text.slice(breakAt)
}

const addOverlap = (chunks: string[], ratio: number): string[] =>
  chunks.map((c, i) => {
    if (i === 0) return c
    const overlap = tailSlice(chunks[i - 1], ratio)
    return overlap ? overlap + "\n\n" + c : c
  })

export const chunkText = (text: string): Chunk[] => {
  const segments = splitByParagraphs(text)
  if (segments.length === 0) return []

  const textChunks = chunkSegments(segments, {
    target: TARGET_CHUNK_SIZE,
    min: MIN_CHUNK_SIZE,
    breakBefore: (s) => isHeading(s.text),
  })

  const texts = textChunks.map((c) => text.slice(c.start, c.end).trim())
  const overlapped = addOverlap(texts, CHUNK_OVERLAP_RATIO)

  return overlapped.map((t, index) => ({
    index,
    text: t,
    hash: hashChunk(t),
  }))
}
