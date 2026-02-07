import type { Spotlight } from "~/domain/spotlight"
import type { EntityRef } from "./types"

const FILE_PROTOCOL = "file://"
const RANGE_DELIMITER = "..."
const ANNOTATION_PREFIX = "annotation_"
const CALLOUT_PREFIX = "callout_"

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

const isAnnotationRef = (path: string): boolean =>
  path.startsWith(ANNOTATION_PREFIX)

const isCalloutRef = (path: string): boolean =>
  path.startsWith(CALLOUT_PREFIX)

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
  if (isAnnotationRef(path)) return { kind: "annotation", id: path }
  if (isCalloutRef(path)) return { kind: "callout", id: path }
  return parseTextRef(path)
}
