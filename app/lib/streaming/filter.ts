export const filterCodeBlocks = (content: string): string | null => {
  const markers = content.match(/```/g)
  if (!markers) return content

  const isAllClosed = markers.length % 2 === 0
  if (isAllClosed) return content

  const lastMarkerIndex = content.lastIndexOf("```")
  const textBefore = content.slice(0, lastMarkerIndex).trim()
  return textBefore || null
}
