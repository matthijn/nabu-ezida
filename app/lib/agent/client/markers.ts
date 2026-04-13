import type { Block } from "./blocks"

const APPROACH_MARKER_PATTERN = /^<!--\s*approach:\s*([\w/-]+)\s*-->$/

export const toMarkerBlock = (key: string): Block => ({
  type: "system",
  content: `<!-- approach: ${key} -->`,
})

export const fromMarkerBlock = (block: Block): string | null => {
  if (block.type !== "system") return null
  const match = block.content.match(APPROACH_MARKER_PATTERN)
  return match ? match[1] : null
}
