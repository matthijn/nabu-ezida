const DRIFT_THRESHOLD = 0.2

const hash = (s: string): number => {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0
  }
  return h
}

const buildLineFrequencies = (lines: string[]): Map<number, number> => {
  const freq = new Map<number, number>()
  for (const line of lines) {
    const h = hash(line)
    freq.set(h, (freq.get(h) ?? 0) + 1)
  }
  return freq
}

export const hasSignificantTextDrift = (prev: string, curr: string): boolean => {
  if (prev === curr) return false

  const prevLines = prev.split("\n")
  const currLines = curr.split("\n")

  if (currLines.length === 0) return false

  const prevFreq = buildLineFrequencies(prevLines)
  const currFreq = buildLineFrequencies(currLines)

  let diff = 0

  for (const [lineHash, count] of prevFreq) {
    const currCount = currFreq.get(lineHash) ?? 0
    diff += Math.abs(count - currCount)
  }

  for (const [lineHash, count] of currFreq) {
    if (!prevFreq.has(lineHash)) {
      diff += count
    }
  }

  diff += Math.abs(prevLines.length - currLines.length)

  return diff / currLines.length > DRIFT_THRESHOLD
}
