import { CHARS_PER_TOKEN } from "./constants"

interface ExcerptSection {
  label: string
  text: string
}

const SEPARATOR = "\n...\n"

const splitParagraphs = (text: string): string[] =>
  text.split("\n\n").filter((p) => p.trim().length > 0)

const estimateTokens = (text: string): number => Math.ceil(text.length / CHARS_PER_TOKEN)

const collectFromStart = (paragraphs: string[], tokenBudget: number): string[] => {
  const collected: string[] = []
  let tokens = 0
  for (const p of paragraphs) {
    const pTokens = estimateTokens(p)
    if (tokens + pTokens > tokenBudget && collected.length > 0) break
    collected.push(p)
    tokens += pTokens
  }
  return collected
}

const collectFromEnd = (paragraphs: string[], tokenBudget: number): string[] => {
  const collected: string[] = []
  let tokens = 0
  for (let i = paragraphs.length - 1; i >= 0; i--) {
    const pTokens = estimateTokens(paragraphs[i])
    if (tokens + pTokens > tokenBudget && collected.length > 0) break
    collected.unshift(paragraphs[i])
    tokens += pTokens
  }
  return collected
}

const collectFromMiddle = (paragraphs: string[], tokenBudget: number): string[] => {
  const midIndex = Math.floor(paragraphs.length / 2)
  const collected: string[] = []
  let tokens = 0
  let lo = midIndex
  let hi = midIndex + 1

  if (lo < paragraphs.length) {
    collected.push(paragraphs[lo])
    tokens += estimateTokens(paragraphs[lo])
    lo--
  }

  while (lo >= 0 || hi < paragraphs.length) {
    if (hi < paragraphs.length) {
      const pTokens = estimateTokens(paragraphs[hi])
      if (tokens + pTokens > tokenBudget && collected.length > 0) break
      collected.push(paragraphs[hi])
      tokens += pTokens
      hi++
    }
    if (lo >= 0) {
      const pTokens = estimateTokens(paragraphs[lo])
      if (tokens + pTokens > tokenBudget && collected.length > 0) break
      collected.unshift(paragraphs[lo])
      tokens += pTokens
      lo--
    }
  }

  return collected
}

const joinParagraphs = (paragraphs: string[]): string => paragraphs.join("\n\n")

const formatSections = (sections: ExcerptSection[]): string =>
  sections.map((s) => s.text).join(SEPARATOR)

const isFullyCovered = (text: string, tokenBudget: number): boolean =>
  estimateTokens(text) <= tokenBudget * 3

export const buildExcerpt = (text: string, tokensPerSection: number): string => {
  const trimmed = text.trim()
  if (trimmed.length === 0) return ""
  if (isFullyCovered(trimmed, tokensPerSection)) return trimmed

  const paragraphs = splitParagraphs(trimmed)
  if (paragraphs.length === 0) return ""

  const start = collectFromStart(paragraphs, tokensPerSection)
  const end = collectFromEnd(paragraphs, tokensPerSection)
  const middle = collectFromMiddle(paragraphs, tokensPerSection)

  const startEnd = start.length + end.length
  const hasMiddleOverlap = paragraphs.length <= startEnd + middle.length

  if (hasMiddleOverlap) return trimmed

  const sections: ExcerptSection[] = [
    { label: "start", text: joinParagraphs(start) },
    { label: "middle", text: joinParagraphs(middle) },
    { label: "end", text: joinParagraphs(end) },
  ]

  return formatSections(sections)
}
