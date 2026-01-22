import type { Spotlight } from "./types"

const RANGE_DELIMITER = "..."

export const serializeSpotlight = (spotlight: Spotlight): string => {
  switch (spotlight.type) {
    case "single":
      return spotlight.text
    case "range":
      return `${spotlight.from}${RANGE_DELIMITER}${spotlight.to}`
  }
}
