import type { Spotlight } from "./types"
import { serializeSpotlight } from "./serialize"

const toSpotlight = (texts: string[]): Spotlight =>
  texts.length === 1
    ? { type: "single", text: texts[0] }
    : { type: "range", from: texts[0], to: texts[texts.length - 1] }

const encodeSpotlight = (text: string): string =>
  encodeURIComponent(text.toLowerCase()).replace(/%20/g, "+")

export const buildSpotlightUrl = (
  projectId: string,
  documentId: string,
  texts: string[]
): string => {
  const spotlight = toSpotlight(texts)
  return `/project/${projectId}/file/${documentId}?spotlight=${encodeSpotlight(serializeSpotlight(spotlight))}`
}
