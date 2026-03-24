import type { Spotlight } from "./types"

const RANGE_DELIMITER = "..."

const normalizeEllipsis = (text: string): string => text.replace(/\u2026/g, "...")

const decodeSpotlight = (param: string): string => normalizeEllipsis(param.replace(/\+/g, " "))

const isRange = (text: string): boolean => text.includes(RANGE_DELIMITER)

const parseRange = (text: string): Spotlight | null => {
  const idx = text.indexOf(RANGE_DELIMITER)
  const from = text.slice(0, idx)
  const to = text.slice(idx + RANGE_DELIMITER.length)
  if (!from || !to) return null
  return { type: "range", from, to }
}

const parseSingle = (text: string): Spotlight => ({ type: "single", text })

export const parseSpotlightText = (text: string): Spotlight | null => {
  if (!text) return null
  if (isRange(text)) return parseRange(text)
  return parseSingle(text)
}

export const parseSpotlight = (param: string | null): Spotlight | null => {
  if (!param) return null
  return parseSpotlightText(decodeSpotlight(param))
}
