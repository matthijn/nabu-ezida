import type { Spotlight } from "./types"
import { serializeSpotlight } from "./serialize"

const toSpotlight = (blockIds: string[]): Spotlight =>
  blockIds.length === 1
    ? { type: "single", blockId: blockIds[0] }
    : { type: "range", from: blockIds[0], to: blockIds[blockIds.length - 1] }

export const buildSpotlightUrl = (
  projectId: string,
  documentId: string,
  blockIds: string[]
): string => {
  const spotlight = toSpotlight(blockIds)
  return `/project/${projectId}/file/${documentId}?spotlight=${serializeSpotlight(spotlight)}`
}
