import type { SearchHit } from "~/domain/search"
import { callLlm, extractText } from "~/lib/agent/client"

const SEMANTIC_FILTER_ENDPOINT = "/semantic-filter"
const NO_MATCH = "NO_MATCH"

const buildFilterMessage = (intent: string, lenses: string[], passage: string): string =>
  `intent: ${intent}\nlenses: ${lenses.join(", ")}\npassage: ${passage}`

const isMatch = (response: string): boolean => response.trim() !== NO_MATCH

const filterOneHit = async (
  hit: SearchHit,
  intent: string,
  lenses: string[]
): Promise<SearchHit | null> => {
  if (!hit.text) return hit

  try {
    const blocks = await callLlm({
      endpoint: SEMANTIC_FILTER_ENDPOINT,
      messages: [
        { type: "message", role: "user", content: buildFilterMessage(intent, lenses, hit.text) },
      ],
    })

    const response = extractText(blocks)
    if (!response || !isMatch(response)) return null

    return { ...hit, text: response.trim() }
  } catch (e) {
    console.error("[FILTER] failed for", hit.file, e)
    return null
  }
}

export const filterHits = async (
  hits: SearchHit[],
  intent: string,
  lenses: string[]
): Promise<SearchHit[]> => {
  const settled = await Promise.allSettled(hits.map((hit) => filterOneHit(hit, intent, lenses)))
  return settled
    .filter((r): r is PromiseFulfilledResult<SearchHit | null> => r.status === "fulfilled")
    .map((r) => r.value)
    .filter((hit): hit is SearchHit => hit !== null)
}
