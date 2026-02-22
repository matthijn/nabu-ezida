const ENTITY_ID_CANDIDATE = /(annotation|callout)_[a-zA-Z0-9][a-zA-Z0-9_-]*/

export const extractEntityIdCandidates = (text: string): string[] => {
  const matches = text.match(new RegExp(ENTITY_ID_CANDIDATE.source, "g"))
  return matches ? [...new Set(matches)] : []
}
