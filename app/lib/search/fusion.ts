export interface ScoredChunk {
  file: string
  text?: string
  hash?: string
  score: number
}

export const CANDIDATE_POOL_SIZE = 200

export const chunkKey = (row: ScoredChunk): string => row.hash ?? `${row.file}:${row.text}`

export const normalizeBm25Scores = (rows: ScoredChunk[]): Map<string, number> => {
  const result = new Map<string, number>()
  if (rows.length === 0) return result

  const negated = rows.map((r) => ({ key: chunkKey(r), value: -r.score }))

  const min = Math.min(...negated.map((n) => n.value))
  const max = Math.max(...negated.map((n) => n.value))
  const range = max - min

  for (const { key, value } of negated) {
    result.set(key, range === 0 ? 1 : (value - min) / range)
  }

  return result
}

export const mergeScoreMaps = (maps: Map<string, number>[]): Map<string, number> => {
  const totals = new Map<string, number>()

  for (const map of maps) {
    for (const [key, score] of map) {
      totals.set(key, (totals.get(key) ?? 0) + score)
    }
  }

  return totals
}

const buildChunkLookup = (chunks: ScoredChunk[]): Map<string, ScoredChunk> => {
  const lookup = new Map<string, ScoredChunk>()
  for (const chunk of chunks) {
    lookup.set(chunkKey(chunk), chunk)
  }
  return lookup
}

const toCosineMap = (rows: ScoredChunk[]): Map<string, number> => {
  const map = new Map<string, number>()
  for (const row of rows) {
    map.set(chunkKey(row), row.score)
  }
  return map
}

export interface HybridInput {
  cosinePerAngle: ScoredChunk[][]
  bm25: ScoredChunk[]
}

export const fuseHybridResults = (input: HybridInput, limit: number): ScoredChunk[] => {
  const normalizedBm25 = normalizeBm25Scores(input.bm25)

  const angleMaps = input.cosinePerAngle.map((cosine) =>
    mergeScoreMaps([toCosineMap(cosine), normalizedBm25])
  )

  const totals = mergeScoreMaps(angleMaps)

  const allChunks = [...input.cosinePerAngle.flat(), ...input.bm25]
  const chunkLookup = buildChunkLookup(allChunks)

  const sorted = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit)

  return sorted.flatMap(([key, score]) => {
    const chunk = chunkLookup.get(key)
    if (!chunk) return []
    return [{ file: chunk.file, text: chunk.text, hash: chunk.hash, score }]
  })
}
