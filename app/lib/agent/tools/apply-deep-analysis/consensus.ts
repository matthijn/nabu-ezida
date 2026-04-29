export interface FindResult {
  start: number
  end: number
  analysis_source_id: string
}

export interface ConsensusSpan {
  start: number
  end: number
  analysis_source_id: string
}

export const tallyVotes = (
  runs: FindResult[][],
  sentenceCount: number
): Map<string, Map<number, number>> => {
  const tally = new Map<string, Map<number, number>>()
  for (const run of runs) {
    const seen = new Set<string>()
    for (const r of run) {
      for (let s = r.start; s <= Math.min(r.end, sentenceCount); s++) {
        const key = `${r.analysis_source_id}:${s}`
        if (seen.has(key)) continue
        seen.add(key)
        if (!tally.has(r.analysis_source_id)) tally.set(r.analysis_source_id, new Map())
        const codeMap = tally.get(r.analysis_source_id) as Map<number, number>
        codeMap.set(s, (codeMap.get(s) ?? 0) + 1)
      }
    }
  }
  return tally
}

export const groupConsecutive = (sentences: number[], code: string): ConsensusSpan[] => {
  if (sentences.length === 0) return []
  const sorted = [...sentences].sort((a, b) => a - b)
  const spans: ConsensusSpan[] = []
  let start = sorted[0]
  let end = sorted[0]

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === end + 1) {
      end = sorted[i]
    } else {
      spans.push({ start, end, analysis_source_id: code })
      start = sorted[i]
      end = sorted[i]
    }
  }
  spans.push({ start, end, analysis_source_id: code })
  return spans
}

export const consensus = (
  runs: FindResult[][],
  sentenceCount: number,
  threshold: number
): ConsensusSpan[] => {
  const tally = tallyVotes(runs, sentenceCount)
  const spans: ConsensusSpan[] = []

  for (const [code, votesMap] of tally) {
    const matched = [...votesMap.entries()].filter(([, v]) => v >= threshold).map(([s]) => s)
    spans.push(...groupConsecutive(matched, code))
  }

  return spans
}
