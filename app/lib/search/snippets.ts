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
