import { tokenize, buildFrequencies, tokenOverlap } from "./tokens"

export type Match = {
  text: string
  start: number
  end: number
}

type WordPosition = {
  token: string
  start: number
  end: number
}

const MIN_OVERLAP = 0.8

const extractWordPositions = (text: string): WordPosition[] => {
  const positions: WordPosition[] = []
  let current = ""
  let start = -1

  for (let i = 0; i < text.length; i++) {
    const char = text[i].toLowerCase()
    const code = char.charCodeAt(0)
    const isWordChar = (code >= 97 && code <= 122) || (code >= 48 && code <= 57)

    if (isWordChar) {
      if (start === -1) start = i
      current += char
    } else if (current.length > 0) {
      positions.push({ token: current, start, end: i })
      current = ""
      start = -1
    }
  }

  if (current.length > 0) {
    positions.push({ token: current, start, end: text.length })
  }

  return positions
}

const isSubsequence = (needle: string[], window: string[]): boolean => {
  let needleIdx = 0
  for (const token of window) {
    if (needleIdx < needle.length && token === needle[needleIdx]) {
      needleIdx++
    }
  }
  return needleIdx === needle.length
}

export const findText = (needle: string, haystack: string): Match | null => {
  const needleTokens = tokenize(needle)
  if (needleTokens.length === 0) return null

  const needleFreq = buildFrequencies(needleTokens)
  const positions = extractWordPositions(haystack)

  if (positions.length < needleTokens.length) return null

  for (let i = 0; i <= positions.length - needleTokens.length; i++) {
    const window = positions.slice(i, i + needleTokens.length)
    const windowTokens = window.map(p => p.token)
    const windowFreq = buildFrequencies(windowTokens)

    const overlap = tokenOverlap(needleFreq, windowFreq, needleTokens.length, windowTokens.length)

    if (overlap >= MIN_OVERLAP && isSubsequence(needleTokens, windowTokens)) {
      const start = window[0].start
      const end = window[window.length - 1].end
      return { text: haystack.slice(start, end), start, end }
    }
  }

  return null
}

export const findTextRange = (
  from: string,
  to: string,
  haystack: string
): { start: number; end: number } | null => {
  const fromMatch = findText(from, haystack)
  if (!fromMatch) return null

  const toMatch = findText(to, haystack.slice(fromMatch.start))
  if (!toMatch) return null

  return {
    start: fromMatch.start,
    end: fromMatch.start + toMatch.end,
  }
}
