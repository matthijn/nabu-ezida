import { getEntityPrefixes } from "~/lib/data-blocks/registry"

const buildCandidatePattern = (prefixes: string[]): RegExp =>
  new RegExp(`(${prefixes.join("|")})-[a-zA-Z0-9][a-zA-Z0-9_-]*`, "g")

export const extractEntityIdCandidates = (text: string): string[] => {
  const pattern = buildCandidatePattern(getEntityPrefixes())
  const matches = text.match(pattern)
  return matches ? [...new Set(matches)] : []
}
