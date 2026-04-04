import type { Block } from "./blocks"

export const toMarkerBlock = (key: string): Block => ({
  type: "system",
  content: `<!-- approach: ${key} -->`,
})
