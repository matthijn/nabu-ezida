import { tokenize, buildFrequencies, tokenOverlap } from "./tokens"

const DRIFT_THRESHOLD = 0.2

export type TextFingerprint = {
  tokenCount: number
  frequencies: Map<string, number>
}

export const computeTextFingerprint = (text: string): TextFingerprint => {
  const tokens = tokenize(text)
  return {
    tokenCount: tokens.length,
    frequencies: buildFrequencies(tokens),
  }
}

export const hasSignificantTextDrift = (prev: TextFingerprint, curr: TextFingerprint): boolean => {
  if (prev.tokenCount === 0) return curr.tokenCount > 0
  const overlap = tokenOverlap(prev.frequencies, curr.frequencies, prev.tokenCount, curr.tokenCount)
  return overlap < (1 - DRIFT_THRESHOLD)
}
