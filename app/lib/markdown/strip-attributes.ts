import { findBlocksByLanguage } from "~/lib/data-blocks/parse"

const collapseBlankLines = (text: string): string => text.replace(/\n{3,}/g, "\n\n")

export const stripAttributesBlock = (raw: string): string => {
  const blocks = findBlocksByLanguage(raw, "json-attributes")
  if (blocks.length === 0) return raw.trim()

  let result = raw
  for (let i = blocks.length - 1; i >= 0; i--) {
    const block = blocks[i]
    result = result.slice(0, block.start) + result.slice(block.end)
  }

  return collapseBlankLines(result).trim()
}
