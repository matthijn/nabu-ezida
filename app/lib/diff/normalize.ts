export const isBlankLine = (s: string): boolean => /^[ \t]*$/.test(s)

export const normalizeLine = (line: string): string =>
  spacesToTabs(trimTrailing(line))

export const normalizeContent = (text: string): string =>
  trimTrailingBlanks(
    collapseBlankLines(
      text.split("\n").map(normalizeLine)
    )
  ).join("\n")

const trimTrailing = (s: string): string => s.replace(/[ \t]+$/, "")

const spacesToTabs = (s: string): string => {
  const match = s.match(/^([ \t]*)(.*)$/)
  if (!match) return s
  const [, indent, rest] = match
  const tabified = indent.replace(/ {2}/g, "\t").replace(/ /g, "")
  return tabified + rest
}

const collapseBlankLines = (lines: string[]): string[] =>
  lines.reduce<string[]>((acc, line) => {
    const prev = acc[acc.length - 1]
    if (isBlankLine(line) && prev !== undefined && isBlankLine(prev)) return acc
    acc.push(isBlankLine(line) ? "" : line)
    return acc
  }, [])

const trimTrailingBlanks = (lines: string[]): string[] => {
  const result = [...lines]
  while (result.length > 0 && isBlankLine(result[result.length - 1])) result.pop()
  return result
}
