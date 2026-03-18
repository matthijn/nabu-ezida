import { createCappedCache } from "~/lib/utils"

export interface Match {
  start: number
  end: number
  fuzzy: boolean
}

export interface MatchOffset {
  start: number
  end: number
}

export const findMatches = (content: string, needle: string): Match[] => {
  const contentLines = toLines(content)
  const needleLines = toLines(needle)

  if (needleLines.length === 0) return []
  if (needleLines.length > contentLines.length) return []

  const exactMatches = findExactMatches(contentLines, needleLines)
  if (exactMatches.length > 0) return exactMatches

  return findFuzzyMatches(contentLines, needleLines)
}

export const getMatchedText = (content: string, match: Match): string => {
  const lines = toLines(content)
  return lines.slice(match.start, match.end + 1).join("\n")
}

const SIMILARITY_THRESHOLD = 0.9

const toLines = (text: string): string[] => {
  const lines = text.split("\n")
  while (lines.length > 0 && lines[lines.length - 1] === "") {
    lines.pop()
  }
  return lines
}

const toBigrams = (s: string): Map<string, number> => {
  const grams = new Map<string, number>()
  for (let i = 0; i < s.length - 1; i++) {
    const pair = s.slice(i, i + 2)
    grams.set(pair, (grams.get(pair) ?? 0) + 1)
  }
  return grams
}

const bigramSimilarity = (a: string, b: string): number => {
  if (a === b) return 1
  if (a.length < 2 || b.length < 2) return 0
  const gramsA = toBigrams(a)
  const gramsB = toBigrams(b)
  let intersection = 0
  for (const [pair, countB] of gramsB) {
    const countA = gramsA.get(pair) ?? 0
    intersection += Math.min(countA, countB)
  }
  return (2 * intersection) / (a.length - 1 + b.length - 1)
}

const findExactMatches = (contentLines: string[], needleLines: string[]): Match[] => {
  const matches: Match[] = []
  const needleText = needleLines.join("\n")

  for (let i = 0; i <= contentLines.length - needleLines.length; i++) {
    const slice = contentLines.slice(i, i + needleLines.length)
    if (slice.join("\n") === needleText) {
      matches.push({ start: i, end: i + needleLines.length - 1, fuzzy: false })
    }
  }

  return matches
}

const blockSimilarity = (
  contentLines: string[],
  needleLines: string[],
  startIndex: number
): number => {
  let totalScore = 0

  for (let i = 0; i < needleLines.length; i++) {
    const score = bigramSimilarity(contentLines[startIndex + i], needleLines[i])
    if (score < SIMILARITY_THRESHOLD) return 0
    totalScore += score
  }

  return totalScore / needleLines.length
}

const findFuzzyMatches = (contentLines: string[], needleLines: string[]): Match[] => {
  const matches: { match: Match; score: number }[] = []

  for (let i = 0; i <= contentLines.length - needleLines.length; i++) {
    const score = blockSimilarity(contentLines, needleLines, i)
    if (score >= SIMILARITY_THRESHOLD) {
      matches.push({ match: { start: i, end: i + needleLines.length - 1, fuzzy: true }, score })
    }
  }

  return matches.sort((a, b) => b.score - a.score).map((m) => m.match)
}

const TOKEN_OVERLAP_THRESHOLD = 0.8
const MIN_FUZZY_WORDS = 4
const MIN_UNIQUE_FUZZY_WORDS = 2

interface Token {
  word: string
  start: number
  end: number
}

const WORD_PATTERN = /\S+/g

const normalizeWord = (raw: string): string =>
  raw.toLowerCase().replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, "")

const tokenize = (text: string): Token[] => {
  const tokens: Token[] = []
  let match: RegExpExecArray | null
  WORD_PATTERN.lastIndex = 0
  while ((match = WORD_PATTERN.exec(text)) !== null) {
    const word = normalizeWord(match[0])
    if (word) tokens.push({ word, start: match.index, end: match.index + match[0].length })
  }
  return tokens
}

const tokenizeWords = (text: string): string[] => {
  const words: string[] = []
  let match: RegExpExecArray | null
  WORD_PATTERN.lastIndex = 0
  while ((match = WORD_PATTERN.exec(text)) !== null) {
    const word = normalizeWord(match[0])
    if (word) words.push(word)
  }
  return words
}

const tokenCache = createCappedCache<string, Token[]>(50)

const getDocTokens = (content: string): Token[] => {
  const cached = tokenCache.get(content)
  if (cached) return cached
  const tokens = tokenize(content)
  tokenCache.set(content, tokens)
  return tokens
}

const scoreTokenWindow = (needleWords: Set<string>, windowTokens: Token[]): number => {
  let hits = 0
  for (const token of windowTokens) {
    if (needleWords.has(token.word)) hits++
  }
  return hits / needleWords.size
}

const findUniqueTokenMatch = (
  docTokens: Token[],
  needleSet: Set<string>,
  windowSize: number
): MatchOffset | null => {
  let found: MatchOffset | null = null
  for (let i = 0; i <= docTokens.length - windowSize; i++) {
    const window = docTokens.slice(i, i + windowSize)
    if (scoreTokenWindow(needleSet, window) >= TOKEN_OVERLAP_THRESHOLD) {
      if (found) return null
      found = { start: window[0].start, end: window[window.length - 1].end }
    }
  }
  return found
}

const findTokenMatchOffset = (docTokens: Token[], needleWords: string[]): MatchOffset | null => {
  if (needleWords.length < MIN_UNIQUE_FUZZY_WORDS) return null

  const needleSet = new Set(needleWords)
  const windowSize = needleWords.length
  const requireUnique = needleWords.length < MIN_FUZZY_WORDS

  if (docTokens.length < windowSize) return null

  if (requireUnique) return findUniqueTokenMatch(docTokens, needleSet, windowSize)

  for (let i = 0; i <= docTokens.length - windowSize; i++) {
    const window = docTokens.slice(i, i + windowSize)
    if (scoreTokenWindow(needleSet, window) >= TOKEN_OVERLAP_THRESHOLD) {
      return { start: window[0].start, end: window[window.length - 1].end }
    }
  }

  return null
}

const flattenNewlines = (text: string): string => text.replace(/[\r\n]/g, " ")

const findExactOffset = (content: string, needle: string): MatchOffset | null => {
  const idx = flattenNewlines(content).toLowerCase().indexOf(flattenNewlines(needle).toLowerCase())
  if (idx < 0) return null
  return { start: idx, end: idx + needle.length }
}

const findBestOffset = (content: string, needle: string): MatchOffset | null => {
  const exact = findExactOffset(content, needle)
  if (exact) return exact

  const docTokens = getDocTokens(content)
  const needleWords = tokenizeWords(needle)
  return findTokenMatchOffset(docTokens, needleWords)
}

export const findMatchOffset = (content: string, needle: string): MatchOffset | null =>
  findBestOffset(content, needle)
