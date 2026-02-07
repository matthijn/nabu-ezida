import type { Spotlight } from "./types"

const FILE_PROTOCOL = "file://"
const RANGE_DELIMITER = "..."

type FileLink = {
  documentId: string
  spotlight: Spotlight | null
}

const parseTextPart = (textPart: string): Spotlight | null => {
  if (!textPart) return null
  if (textPart.includes(RANGE_DELIMITER)) {
    const idx = textPart.indexOf(RANGE_DELIMITER)
    const from = textPart.slice(0, idx)
    const to = textPart.slice(idx + RANGE_DELIMITER.length)
    if (!from || !to) return null
    return { type: "range", from, to }
  }
  return { type: "single", text: textPart }
}

export const parseFileLink = (href: string): FileLink | null => {
  if (!href.startsWith(FILE_PROTOCOL)) return null
  const path = href.slice(FILE_PROTOCOL.length)
  const slashIndex = path.indexOf("/")

  if (slashIndex === -1) {
    return { documentId: path, spotlight: null }
  }

  const documentId = path.slice(0, slashIndex)
  const textPart = decodeURIComponent(path.slice(slashIndex + 1))
  return { documentId, spotlight: parseTextPart(textPart) }
}
