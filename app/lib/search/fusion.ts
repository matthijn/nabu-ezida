export interface ScoredChunk {
  file: string
  text?: string
  hash?: string
  score: number
}

export const chunkKey = (row: ScoredChunk): string => row.hash ?? `${row.file}:${row.text}`

const buildChunkLookup = (chunks: ScoredChunk[]): Map<string, ScoredChunk> => {
  const lookup = new Map<string, ScoredChunk>()
  for (const chunk of chunks) {
    lookup.set(chunkKey(chunk), chunk)
  }
  return lookup
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

const toCosineMap = (rows: ScoredChunk[]): Map<string, number> => {
  const map = new Map<string, number>()
  for (const row of rows) {
    map.set(chunkKey(row), row.score)
  }
  return map
}

const MIN_FUSED_SCORE = 0.3

const isAboveMinScore = ([, score]: [string, number]): boolean => score > MIN_FUSED_SCORE

export const fuseCosineResults = (cosinePerHyde: ScoredChunk[][], limit: number): ScoredChunk[] => {
  const scoreMaps = cosinePerHyde.map(toCosineMap)
  const totals = mergeScoreMaps(scoreMaps)

  const allChunks = cosinePerHyde.flat()
  const chunkLookup = buildChunkLookup(allChunks)

  const sorted = [...totals.entries()]
    .filter(isAboveMinScore)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)

  return sorted.flatMap(([key, score]) => {
    const chunk = chunkLookup.get(key)
    if (!chunk) return []
    return [{ file: chunk.file, text: chunk.text, hash: chunk.hash, score }]
  })
}
