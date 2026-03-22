import { hashChunk } from "./hash"
import { TARGET_CHUNK_SIZE, MIN_CHUNK_SIZE } from "./constants"

export interface Chunk {
  index: number
  text: string
  hash: string
}

const splitAtSentences = (text: string): string[] => {
  const parts = text.split(". ")
  if (parts.length <= 1) return splitAtWords(text)
  return parts.map((p, i) => (i < parts.length - 1 ? p + "." : p))
}

const splitAtWords = (text: string): string[] => {
  const mid = Math.floor(text.length / 2)
  const spaceAfter = text.indexOf(" ", mid)
  const spaceBefore = text.lastIndexOf(" ", mid)
  const splitAt = spaceAfter !== -1 ? spaceAfter : spaceBefore !== -1 ? spaceBefore : mid
  return [text.slice(0, splitAt), text.slice(splitAt + 1)]
}

const splitLargeSegment = (text: string): string[] => {
  if (text.length <= TARGET_CHUNK_SIZE) return [text]

  const parts = splitAtSentences(text)
  return parts.flatMap((p) => splitLargeSegment(p))
}

const isHeading = (segment: string): boolean => segment.trimStart().startsWith("#")

interface Accumulator {
  chunks: string[]
  buffer: string
  pendingHeading: string
}

const flushBuffer = (acc: Accumulator): Accumulator => {
  if (acc.buffer.trim().length === 0) return acc
  return { ...acc, chunks: [...acc.chunks, acc.buffer.trim()], buffer: "" }
}

const appendToBuffer = (acc: Accumulator, segment: string): Accumulator => {
  const joined = acc.buffer ? acc.buffer + "\n\n" + segment : segment
  return { ...acc, buffer: joined }
}

const processSegment = (acc: Accumulator, segment: string): Accumulator => {
  const text = acc.pendingHeading ? acc.pendingHeading + "\n\n" + segment : segment
  const withoutHeading = { ...acc, pendingHeading: "" }

  if (isHeading(segment) && !acc.pendingHeading) {
    return { ...flushBuffer(withoutHeading), pendingHeading: segment.trim() }
  }

  const expanded = splitLargeSegment(text)
  return expanded.reduce((a, part) => {
    const combined = a.buffer ? a.buffer + "\n\n" + part : part
    if (combined.length > TARGET_CHUNK_SIZE && a.buffer.length >= MIN_CHUNK_SIZE) {
      return appendToBuffer(flushBuffer(a), part)
    }
    return appendToBuffer(a, part)
  }, withoutHeading)
}

const finalize = (acc: Accumulator): Accumulator => {
  const withHeading = acc.pendingHeading ? appendToBuffer(acc, acc.pendingHeading) : acc
  return flushBuffer({ ...withHeading, pendingHeading: "" })
}

const mergeSmallChunks = (chunks: string[]): string[] => {
  if (chunks.length <= 1) return chunks

  return chunks.reduce<string[]>((merged, chunk) => {
    if (merged.length === 0) return [chunk]

    const last = merged[merged.length - 1]
    if (last.length < MIN_CHUNK_SIZE) {
      return [...merged.slice(0, -1), last + "\n\n" + chunk]
    }
    return [...merged, chunk]
  }, [])
}

export const chunkText = (text: string): Chunk[] => {
  const segments = text.split("\n\n").filter((s) => s.trim().length > 0)
  if (segments.length === 0) return []

  const initial: Accumulator = { chunks: [], buffer: "", pendingHeading: "" }
  const result = finalize(segments.reduce(processSegment, initial))
  const merged = mergeSmallChunks(result.chunks)

  return merged.map((text, index) => ({
    index,
    text,
    hash: hashChunk(text),
  }))
}
