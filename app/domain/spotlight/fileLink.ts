import type { Spotlight } from "./types"
import { serializeSpotlight } from "./serialize"

const FILE_PROTOCOL = "file://"
const RANGE_DELIMITER = ".."

type FileLink = {
  documentId: string
  spotlight: Spotlight | null
}

const parseBlockPart = (blockPart: string): Spotlight | null => {
  if (!blockPart) return null
  if (blockPart.includes(RANGE_DELIMITER)) {
    const [from, to] = blockPart.split(RANGE_DELIMITER)
    if (!from || !to) return null
    return { type: "range", from, to }
  }
  return { type: "single", blockId: blockPart }
}

export const parseFileLink = (href: string): FileLink | null => {
  if (!href.startsWith(FILE_PROTOCOL)) return null
  const path = href.slice(FILE_PROTOCOL.length)
  const slashIndex = path.indexOf("/")

  if (slashIndex === -1) {
    return { documentId: path, spotlight: null }
  }

  const documentId = path.slice(0, slashIndex)
  const blockPart = path.slice(slashIndex + 1)
  return { documentId, spotlight: parseBlockPart(blockPart) }
}

export const resolveFileLink = (href: string, projectId: string): string | null => {
  const parsed = parseFileLink(href)
  if (!parsed) return null

  const base = `/project/${projectId}/file/${parsed.documentId}`
  if (!parsed.spotlight) return base
  return `${base}?spotlight=${serializeSpotlight(parsed.spotlight)}`
}
