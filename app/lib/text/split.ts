import type { Segment, Splitter } from "./types"

const isNonEmpty = (s: Segment): boolean => s.text.trim().length > 0

const buildSegmenter = (lang: string): Intl.Segmenter =>
  new Intl.Segmenter(lang, { granularity: "sentence" })

export const splitBySentences = (lang = "en"): Splitter => {
  const segmenter = buildSegmenter(lang)

  return (text) => {
    const segments: Segment[] = []
    for (const { segment, index } of segmenter.segment(text)) {
      const trimmed = segment.trim()
      if (trimmed.length === 0) continue
      const start = index + segment.indexOf(trimmed)
      segments.push({ text: trimmed, start, end: start + trimmed.length })
    }
    return segments
  }
}

const splitOn = (text: string, separator: string | RegExp): Segment[] => {
  const parts = text.split(separator)
  const segments: Segment[] = []
  let offset = 0

  for (const part of parts) {
    const start = text.indexOf(part, offset)
    const end = start + part.length
    segments.push({ text: part, start, end })
    offset = end
  }

  return segments
}

export const splitByLines: Splitter = (text) => splitOn(text, "\n")

export const splitByParagraphs: Splitter = (text) => splitOn(text, /\n\n+/).filter(isNonEmpty)
