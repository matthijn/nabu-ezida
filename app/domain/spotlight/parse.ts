import type { Spotlight } from "./types"

const RANGE_DELIMITER = ".."

const isRange = (param: string): boolean =>
  param.includes(RANGE_DELIMITER)

const parseRange = (param: string): Spotlight | null => {
  const [from, to] = param.split(RANGE_DELIMITER)
  if (!from || !to) return null
  return { type: "range", from, to }
}

const parseSingle = (param: string): Spotlight =>
  ({ type: "single", blockId: param })

export const parseSpotlight = (param: string | null): Spotlight | null => {
  if (!param) return null
  if (isRange(param)) return parseRange(param)
  return parseSingle(param)
}
