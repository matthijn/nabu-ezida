import type { Spotlight } from "./types"

const RANGE_DELIMITER = "..."

const decodeSpotlight = (param: string): string =>
  param.replace(/\+/g, " ")

const isRange = (param: string): boolean =>
  param.includes(RANGE_DELIMITER)

const parseRange = (param: string): Spotlight | null => {
  const idx = param.indexOf(RANGE_DELIMITER)
  const from = param.slice(0, idx)
  const to = param.slice(idx + RANGE_DELIMITER.length)
  if (!from || !to) return null
  return { type: "range", from, to }
}

const parseSingle = (param: string): Spotlight =>
  ({ type: "single", text: param })

export const parseSpotlight = (param: string | null): Spotlight | null => {
  if (!param) return null
  const decoded = decodeSpotlight(param)
  if (isRange(decoded)) return parseRange(decoded)
  return parseSingle(decoded)
}
