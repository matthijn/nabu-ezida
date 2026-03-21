import type { SearchHit } from "~/domain/search"

const splitLines = (content: string): string[] => content.split("\n")

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value))

const isCodeBlockFence = (line: string): boolean => line.trimStart().startsWith("```")

const findIdLine = (lines: string[], id: string): number =>
  lines.findIndex((line) => line.includes(`"id"`) && line.includes(`"${id}"`))

export const extractFileIntro = (content: string, maxLines = 5): string => {
  const lines = splitLines(content)
  const nonEmpty = lines.filter((l) => l.trim() !== "" && !isCodeBlockFence(l))
  return nonEmpty.slice(0, maxLines).join("\n")
}

export interface Snippet {
  line: number
  text: string
}

export const extractSnippetAroundId = (
  content: string,
  id: string,
  contextLines = 3
): Snippet | null => {
  const lines = splitLines(content)
  const idLine = findIdLine(lines, id)
  if (idLine === -1) return null

  const start = clamp(idLine - contextLines, 0, lines.length)
  const end = clamp(idLine + contextLines + 1, 0, lines.length)

  return {
    line: idLine + 1,
    text: lines.slice(start, end).join("\n"),
  }
}

const containsTerm = (line: string, term: string): boolean =>
  line.toLowerCase().includes(term.toLowerCase())

const findTermOccurrences = (lines: string[], term: string): number[] =>
  lines.reduce<number[]>((acc, line, i) => {
    if (containsTerm(line, term)) acc.push(i)
    return acc
  }, [])

export const findHighlightOccurrences = (
  file: string,
  content: string,
  highlights: string[]
): SearchHit[] => {
  const lines = splitLines(content)
  const seen = new Set<number>()
  const hits: SearchHit[] = []

  for (const term of highlights) {
    for (const lineIndex of findTermOccurrences(lines, term)) {
      if (seen.has(lineIndex)) continue
      seen.add(lineIndex)
      hits.push({ type: "text", file, line: lineIndex + 1, term })
    }
  }

  return hits.sort((a, b) => {
    if (a.type !== "text" || b.type !== "text") return 0
    return a.line - b.line
  })
}

const isFileHit = (hit: SearchHit): boolean => hit.type === "file"

export const expandFileHits = (
  hits: SearchHit[],
  highlights: string[],
  getContent: (file: string) => string | undefined
): SearchHit[] => {
  if (highlights.length === 0) return hits

  const expanded: SearchHit[] = []
  for (const hit of hits) {
    if (!isFileHit(hit)) {
      expanded.push(hit)
      continue
    }
    const content = getContent(hit.file)
    if (!content) {
      expanded.push(hit)
      continue
    }
    const textHits = findHighlightOccurrences(hit.file, content, highlights)
    if (textHits.length === 0) {
      expanded.push(hit)
      continue
    }
    expanded.push(...textHits)
  }
  return expanded
}
