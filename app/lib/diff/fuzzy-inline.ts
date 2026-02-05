import stringComparison from "string-comparison"

const FUZZY_PATTERN = /FUZZY\[([^\]]+)\]/g
const SIMILARITY_THRESHOLD = 0.8

const { levenshtein } = stringComparison

type FuzzyMatch = {
  placeholder: string
  needle: string
  replacement: string | null
}

const findBestMatch = (content: string, needle: string): string | null => {
  const needleLen = needle.length
  const minLen = Math.floor(needleLen * 0.7)
  const maxLen = Math.ceil(needleLen * 1.3)

  let bestMatch: string | null = null
  let bestScore = SIMILARITY_THRESHOLD
  let bestLenDiff = Infinity

  for (let start = 0; start < content.length - minLen; start++) {
    for (let len = minLen; len <= maxLen && start + len <= content.length; len++) {
      const candidate = content.slice(start, start + len)

      // Skip candidates with leading/trailing whitespace when needle doesn't have it
      if (!needle.startsWith(" ") && candidate.startsWith(" ")) continue
      if (!needle.endsWith(" ") && candidate.endsWith(" ")) continue

      const score = levenshtein.similarity(needle, candidate)
      const lenDiff = Math.abs(len - needleLen)

      // Prefer higher score, or same score with closer length
      if (score > bestScore || (score === bestScore && lenDiff < bestLenDiff)) {
        bestScore = score
        bestMatch = candidate
        bestLenDiff = lenDiff
      }
    }
  }

  return bestMatch
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
