export const filterCodeBlocks = (content: string): string | null => {
  const markers = content.match(/```/g)
  if (!markers) return content

  const isAllClosed = markers.length % 2 === 0
  if (isAllClosed) return content

  const lastMarkerIndex = content.lastIndexOf("```")
  const textBefore = content.slice(0, lastMarkerIndex).trim()
  return textBefore || null
}

const isCompleteLinkAt = (content: string, bracketIdx: number): boolean => {
  const after = content.slice(bracketIdx)
  return /^\[[^\]]*\]\([^)]*\)/.test(after)
}

export const stripIncompleteLink = (content: string): string => {
  const lastNewline = content.lastIndexOf("\n")
  const lastLine = content.slice(lastNewline + 1)
  const bracketIdx = lastLine.lastIndexOf("[")
  if (bracketIdx === -1) return content
  const absoluteIdx = lastNewline + 1 + bracketIdx
  if (isCompleteLinkAt(content, absoluteIdx)) return content
  const before = content.slice(0, absoluteIdx).trimEnd()
  return before
}

export const preprocessStreaming = (content: string): string | null => {
  const afterCode = filterCodeBlocks(content)
  if (!afterCode) return null
  return stripIncompleteLink(afterCode) || null
}
