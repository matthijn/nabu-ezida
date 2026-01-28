import stringComparison from "string-comparison"

export type Match = { start: number; end: number; fuzzy: boolean }

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

const { levenshtein } = stringComparison

const SIMILARITY_THRESHOLD = 0.9

const toLines = (text: string): string[] => text.split("\n")

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

const lineSimilarity = (a: string, b: string): number => levenshtein.similarity(a, b)

const blockSimilarity = (contentLines: string[], needleLines: string[], startIndex: number): number => {
  let totalScore = 0

  for (let i = 0; i < needleLines.length; i++) {
    const score = lineSimilarity(contentLines[startIndex + i], needleLines[i])
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

  return matches
    .sort((a, b) => b.score - a.score)
    .map((m) => m.match)
}
