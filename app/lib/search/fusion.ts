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
  const best = new Map<string, number>()

  for (const map of maps) {
    for (const [key, score] of map) {
      const current = best.get(key) ?? 0
      if (score > current) best.set(key, score)
    }
  }

  return best
}

const toCosineMap = (rows: ScoredChunk[]): Map<string, number> => {
  const map = new Map<string, number>()
  for (const row of rows) {
    map.set(chunkKey(row), row.score)
  }
  return map
}

const MIN_COSINE_SCORE = 0.3

export const fuseCosineResults = (
  cosinePerHyde: ScoredChunk[][],
  limit: number | undefined
): ScoredChunk[] => {
  const scoreMaps = cosinePerHyde.map(toCosineMap)
  const best = mergeScoreMaps(scoreMaps)

  const allChunks = cosinePerHyde.flat()
  const chunkLookup = buildChunkLookup(allChunks)

  const sorted = [...best.entries()]
    .filter(([, score]) => score >= MIN_COSINE_SCORE)
    .sort((a, b) => b[1] - a[1])
  const sliced = limit !== undefined ? sorted.slice(0, limit) : sorted

  return sliced.flatMap(([key, score]) => {
    const chunk = chunkLookup.get(key)
    if (!chunk) return []
    return [{ file: chunk.file, text: chunk.text, hash: chunk.hash, score }]
  })
}
