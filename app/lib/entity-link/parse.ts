import type { Spotlight } from "~/domain/spotlight"
import type { EntityKind, EntityRef } from "./types"
import { getEntityPrefixes } from "~/lib/blocks/registry"

const FILE_PROTOCOL = "file://"
const RANGE_DELIMITER = "..."

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

const findPrefixedEntity = (path: string): EntityRef | null => {
  for (const prefix of getEntityPrefixes()) {
    if (path.startsWith(prefix + "-")) {
      return { kind: prefix as EntityKind, id: path } as EntityRef
    }
  }
  return null
}

const parseTextRef = (path: string): EntityRef => {
  const slashIndex = path.indexOf("/")
  if (slashIndex === -1) return { kind: "text", documentId: path, spotlight: null }
  const documentId = path.slice(0, slashIndex)
  const textPart = decodeURIComponent(path.slice(slashIndex + 1))
  return { kind: "text", documentId, spotlight: parseTextPart(textPart) }
}

export const parseEntityLink = (href: string): EntityRef | null => {
  if (!href.startsWith(FILE_PROTOCOL)) return null
  const path = href.slice(FILE_PROTOCOL.length)
  if (!path) return null
  const entity = findPrefixedEntity(path)
  if (entity) return entity
  return parseTextRef(path)
}
