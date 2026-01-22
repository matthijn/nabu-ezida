const isWordChar = (char: string): boolean => {
  const code = char.charCodeAt(0)
  return (code >= 97 && code <= 122) || (code >= 48 && code <= 57)
}

export const tokenize = (text: string): string[] => {
  const tokens: string[] = []
  let current = ""
  for (const char of text.toLowerCase()) {
    if (isWordChar(char)) {
      current += char
    } else if (current.length > 0) {
      tokens.push(current)
      current = ""
    }
  }
  if (current.length > 0) tokens.push(current)
  return tokens
}

export const buildFrequencies = (tokens: string[]): Map<string, number> => {
  const freq = new Map<string, number>()
  for (const t of tokens) {
    freq.set(t, (freq.get(t) ?? 0) + 1)
  }
  return freq
}

export const tokenOverlap = (
  freqA: Map<string, number>,
  freqB: Map<string, number>,
  countA: number,
  countB: number
): number => {
  if (countA === 0 && countB === 0) return 1
  if (countA === 0 || countB === 0) return 0

  let satisfied = 0
  for (const [token, countInA] of freqA) {
    const countInB = freqB.get(token) ?? 0
    satisfied += Math.min(countInA, countInB)
  }
  return satisfied / Math.max(countA, countB)
}
