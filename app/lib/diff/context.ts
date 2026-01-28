import type { Match } from "./search"

export const expandMatch = (match: Match, n: number, totalLines: number): Match => ({
  ...match,
  start: Math.max(0, match.start - n),
  end: Math.min(totalLines - 1, match.end + n),
})

export const countLines = (content: string): number => content.split("\n").length
