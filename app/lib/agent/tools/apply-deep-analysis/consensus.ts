export interface FindResult {
  start: number
  end: number
  analysis_source_id: string
}

export type Tier = "certain" | "uncertain"

export interface PromotedSpan {
  start: number
  end: number
  analysis_source_id: string
  tier: Tier
}

export interface ConsensusResult {
  certain: PromotedSpan[]
  uncertain: PromotedSpan[]
}

type Classification = "anchor" | "promotable" | "noise"

export const tallyVotes = (
  runs: FindResult[][],
  sentenceCount: number
): Map<string, Map<number, number>> => {
  const tally = new Map<string, Map<number, number>>()
  for (const run of runs) {
    for (const r of run) {
      if (!tally.has(r.analysis_source_id)) tally.set(r.analysis_source_id, new Map())
      const codeMap = tally.get(r.analysis_source_id) as Map<number, number>
      for (let s = r.start; s <= Math.min(r.end, sentenceCount); s++) {
        codeMap.set(s, (codeMap.get(s) ?? 0) + 1)
      }
    }
  }
  return tally
}

export const classifyTier = (votes: number, n: number): Classification => {
  if (votes >= Math.ceil(n * 0.75)) return "anchor"
  if (votes >= Math.ceil(n * 0.5)) return "promotable"
  return "noise"
}

export const expandAnchors = (
  classifications: Map<number, Classification>,
  sentenceCount: number
): Map<number, Tier> => {
  const result = new Map<number, Tier>()
  const anchors: number[] = []

  for (const [s, c] of classifications) {
    if (c === "anchor") anchors.push(s)
  }
  anchors.sort((a, b) => a - b)

  for (const anchor of anchors) {
    result.set(anchor, "certain")
    for (let s = anchor - 1; s >= 1; s--) {
      if (classifications.get(s) !== "promotable" || result.has(s)) break
      result.set(s, "certain")
    }
    for (let s = anchor + 1; s <= sentenceCount; s++) {
      if (classifications.get(s) !== "promotable" || result.has(s)) break
      result.set(s, "certain")
    }
  }

  for (const [s, c] of classifications) {
    if (c === "promotable" && !result.has(s)) {
      result.set(s, "uncertain")
    }
  }

  return result
}

export const groupConsecutiveSpans = (
  tiers: Map<number, Tier>,
  code: string,
  tier: Tier
): PromotedSpan[] => {
  const sentences = [...tiers.entries()]
    .filter(([, t]) => t === tier)
    .map(([s]) => s)
    .sort((a, b) => a - b)

  if (sentences.length === 0) return []

  const spans: PromotedSpan[] = []
  let start = sentences[0]
  let end = sentences[0]

  for (let i = 1; i < sentences.length; i++) {
    if (sentences[i] === end + 1) {
      end = sentences[i]
    } else {
      spans.push({ start, end, analysis_source_id: code, tier })
      start = sentences[i]
      end = sentences[i]
    }
  }
  spans.push({ start, end, analysis_source_id: code, tier })

  return spans
}

const spanOverlaps = (a: FindResult, b: FindResult): boolean =>
  a.analysis_source_id === b.analysis_source_id && a.start <= b.end && b.start <= a.end

const countOrphans = (run: FindResult[], others: FindResult[][]): number =>
  run.filter((span) => !others.some((other) => other.some((s) => spanOverlaps(span, s)))).length

export const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

export const selectOutlier = (runs: FindResult[][]): number => {
  const counts = runs.map((r) => r.length)
  const med = median(counts)
  const distances = counts.map((c) => Math.abs(c - med))
  const maxDistance = Math.max(...distances)

  const candidates = distances.reduce<number[]>(
    (acc, d, i) => (d === maxDistance ? [...acc, i] : acc),
    []
  )
  if (candidates.length === 1) return candidates[0]

  const orphanCounts = candidates.map((i) => {
    const others = runs.filter((_, j) => j !== i)
    return { index: i, orphans: countOrphans(runs[i], others) }
  })
  orphanCounts.sort((a, b) => b.orphans - a.orphans)
  return orphanCounts[0].index
}

export const dropOutlier = (runs: FindResult[][]): FindResult[][] => {
  if (runs.length <= 1) return runs
  const drop = selectOutlier(runs)
  return runs.filter((_, i) => i !== drop)
}

export const promoteSpans = (
  runs: FindResult[][],
  sentenceCount: number,
  n: number
): ConsensusResult => {
  const tally = tallyVotes(runs, sentenceCount)
  const certain: PromotedSpan[] = []
  const uncertain: PromotedSpan[] = []

  for (const [code, votesMap] of tally) {
    const classifications = new Map<number, Classification>()
    for (const [s, v] of votesMap) {
      classifications.set(s, classifyTier(v, n))
    }

    const tiers = expandAnchors(classifications, sentenceCount)
    certain.push(...groupConsecutiveSpans(tiers, code, "certain"))
    uncertain.push(...groupConsecutiveSpans(tiers, code, "uncertain"))
  }

  return { certain, uncertain }
}
