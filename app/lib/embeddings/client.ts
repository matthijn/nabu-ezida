import { ok, err, type Result } from "~/lib/fp/result"
import { EMBEDDING_DIMENSIONS, EMBEDDING_MODEL, MAX_EMBEDDING_BATCH_SIZE } from "./constants"

export interface EmbeddingError {
  type: "network" | "api"
  message: string
  status?: number
}

interface EmbeddingData {
  index: number
  embedding: number[]
}

interface EmbeddingsApiResponse {
  data: EmbeddingData[]
  usage: { total_tokens: number }
}

const buildRequestBody = (input: string[]): string =>
  JSON.stringify({
    input,
    model: EMBEDDING_MODEL,
    dimensions: EMBEDDING_DIMENSIONS,
  })

const sortByIndex = (data: EmbeddingData[]): number[][] =>
  data.sort((a, b) => a.index - b.index).map((d) => d.embedding)

const fetchBatch = async (
  texts: string[],
  baseUrl: string
): Promise<Result<number[][], EmbeddingError>> => {
  let response: Response
  try {
    response = await fetch(`${baseUrl}/embeddings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: buildRequestBody(texts),
    })
  } catch (e) {
    return err({ type: "network", message: e instanceof Error ? e.message : String(e) })
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "")
    return err({ type: "api", message: body, status: response.status })
  }

  const json = (await response.json()) as EmbeddingsApiResponse
  return ok(sortByIndex(json.data))
}

const toBatches = (texts: string[]): string[][] => {
  const batches: string[][] = []
  for (let i = 0; i < texts.length; i += MAX_EMBEDDING_BATCH_SIZE) {
    batches.push(texts.slice(i, i + MAX_EMBEDDING_BATCH_SIZE))
  }
  return batches
}

export const fetchEmbeddings = async (
  texts: string[],
  baseUrl: string
): Promise<Result<number[][], EmbeddingError>> => {
  if (texts.length === 0) return ok([])

  const batches = toBatches(texts)
  const allEmbeddings: number[][] = []

  for (const batch of batches) {
    const result = await fetchBatch(batch, baseUrl)
    if (!result.ok) return result
    allEmbeddings.push(...result.value)
  }

  return ok(allEmbeddings)
}
