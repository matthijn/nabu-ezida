import { createCappedCache } from "~/lib/utils"

const FUZZY_PATTERN = /FUZZY\[\[([^\]]+)\]\]/g
const TOKEN_OVERLAP_THRESHOLD = 0.8
const MIN_FUZZY_WORDS = 4

type FuzzyMatch = {
  placeholder: string
  needle: string
  replacement: string | null
}

type Token = {
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

const findTokenMatch = (content: string, docTokens: Token[], needleWords: string[]): string | null => {
  if (needleWords.length < MIN_FUZZY_WORDS) return null

  const needleSet = new Set(needleWords)
  const windowSize = needleWords.length

  if (docTokens.length < windowSize) return null

  for (let i = 0; i <= docTokens.length - windowSize; i++) {
    const window = docTokens.slice(i, i + windowSize)
    if (scoreTokenWindow(needleSet, window) >= TOKEN_OVERLAP_THRESHOLD) {
      return content.slice(window[0].start, window[window.length - 1].end)
    }
  }

  return null
}

const flattenNewlines = (text: string): string => text.replace(/[\r\n]/g, " ")

const findExactSubstring = (content: string, needle: string): string | null => {
  const idx = flattenNewlines(content).toLowerCase().indexOf(flattenNewlines(needle).toLowerCase())
  if (idx < 0) return null
  return content.slice(idx, idx + needle.length)
}

const findBestMatch = (content: string, needle: string): string | null => {
  const exact = findExactSubstring(content, needle)
  if (exact) return exact

  const docTokens = getDocTokens(content)
  const needleWords = tokenizeWords(needle)
  return findTokenMatch(content, docTokens, needleWords)
}

const collectFuzzyPatterns = (patch: string): FuzzyMatch[] => {
  const matches: FuzzyMatch[] = []
  let match: RegExpExecArray | null

  FUZZY_PATTERN.lastIndex = 0
  while ((match = FUZZY_PATTERN.exec(patch)) !== null) {
    matches.push({
      placeholder: match[0],
      needle: match[1],
      replacement: null,
    })
  }

  return matches
}

export type FuzzyResult = {
  patch: string
  resolved: number
  unresolved: string[]
}

export const resolveFuzzyPatterns = (patch: string, targetContent: string): FuzzyResult => {
  const patterns = collectFuzzyPatterns(patch)
  if (patterns.length === 0) {
    return { patch, resolved: 0, unresolved: [] }
  }

  let result = patch
  let resolved = 0
  const unresolved: string[] = []

  for (const pattern of patterns) {
    const match = findBestMatch(targetContent, pattern.needle)
    if (match) {
      result = result.replace(pattern.placeholder, match)
      resolved++
    } else {
      unresolved.push(pattern.needle)
    }
  }

  return { patch: result, resolved, unresolved }
}

export const hasFuzzyPatterns = (content: string): boolean => {
  FUZZY_PATTERN.lastIndex = 0
  return FUZZY_PATTERN.test(content)
}
