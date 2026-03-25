import type { SearchHit } from "~/domain/search"
import { callLlm, extractText } from "~/lib/agent/client"

const SEMANTIC_FILTER_ENDPOINT = "/semantic-filter"
const buildFilterMessage = (description: string, intent: string, passage: string): string =>
  `project: ${description}\nintent: ${intent}\npassage: ${passage}`

const hasMarkedSpans = (response: string): boolean => response.includes("<mark>")

const collapseAdjacentMarks = (text: string): string => text.replace(/<\/mark>(\s*)<mark>/g, "$1")

const filterOneHit = async (
  hit: SearchHit,
  description: string,
  intent: string
): Promise<SearchHit | null> => {
  if (!hit.text) return hit

  try {
    const blocks = await callLlm({
      endpoint: SEMANTIC_FILTER_ENDPOINT,
      messages: [
        {
          type: "message",
          role: "user",
          content: buildFilterMessage(description, intent, hit.text),
        },
      ],
    })

    const response = extractText(blocks)
    if (!response || !hasMarkedSpans(response)) return null

    return { ...hit, text: collapseAdjacentMarks(response.trim()) }
  } catch (e) {
    console.error("[FILTER] failed for", hit.file, e)
    return null
  }
}

export const filterHits = async (
  hits: SearchHit[],
  description: string,
  intent: string
): Promise<SearchHit[]> => {
  const settled = await Promise.allSettled(
    hits.map((hit) => filterOneHit(hit, description, intent))
  )
  return settled
    .filter((r): r is PromiseFulfilledResult<SearchHit | null> => r.status === "fulfilled")
    .map((r) => r.value)
    .filter((hit): hit is SearchHit => hit !== null)
}
