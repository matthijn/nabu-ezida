import type { Spotlight } from "./types"

const RANGE_DELIMITER = "..."
const BOUNDARY_WORDS = 4

export const serializeSpotlight = (spotlight: Spotlight): string => {
  switch (spotlight.type) {
    case "single":
      return spotlight.text
    case "range":
      return `${spotlight.from}${RANGE_DELIMITER}${spotlight.to}`
  }
}

const firstNWords = (words: string[], n: number): string => words.slice(0, n).join(" ")
const lastNWords = (words: string[], n: number): string => words.slice(-n).join(" ")

export const spotlightFromText = (text: string): Spotlight | null => {
  const trimmed = text.trim()
  if (!trimmed) return null
  const words = trimmed.split(/\s+/)
  if (words.length <= BOUNDARY_WORDS * 2) return { type: "single", text: trimmed }
  return {
    type: "range",
    from: firstNWords(words, BOUNDARY_WORDS),
    to: lastNWords(words, BOUNDARY_WORDS),
  }
}
