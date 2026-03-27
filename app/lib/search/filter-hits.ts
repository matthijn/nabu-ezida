import type { SearchHit } from "~/domain/search"
import { callLlm, extractText } from "~/lib/agent/client"
import { cacheInStorage } from "~/lib/utils/storage-cache"
import { processPool } from "~/lib/utils/pool"

const SEMANTIC_FILTER_ENDPOINT = "/semantic-filter"
const MARK_RE = /<mark>([\s\S]*?)<\/mark>/g
const FILTER_CONCURRENCY = 5

const buildFilterMessage = (description: string, intent: string, passage: string): string =>
  `project: ${description}\nintent: ${intent}\npassage: ${passage}`

const hasMarkedSpans = (response: string): boolean => response.includes("<mark>")

const collapseAdjacentMarks = (text: string): string => text.replace(/<\/mark>(\s*)<mark>/g, "$1")

export const extractMarkedSections = (text: string, file: string, id?: string): SearchHit[] => {
  const collapsed = collapseAdjacentMarks(text)
  const hits: SearchHit[] = []
  let match: RegExpExecArray | null
  while ((match = MARK_RE.exec(collapsed)) !== null) {
    const section = match[1].trim()
    if (section.length > 0) hits.push({ file, ...(id !== undefined ? { id } : {}), text: section })
  }
  MARK_RE.lastIndex = 0
  return hits
}

const callSemanticFilter = async (
  description: string,
  intent: string,
  passage: string
): Promise<string> => {
  const blocks = await callLlm({
    endpoint: SEMANTIC_FILTER_ENDPOINT,
    messages: [
      {
        type: "message",
        role: "user",
        content: buildFilterMessage(description, intent, passage),
      },
    ],
  })

  return extractText(blocks) ?? ""
}

const cachedCallSemanticFilter = cacheInStorage("filter", callSemanticFilter)

export const filterOneHit = async (
  hit: SearchHit,
  description: string,
  intent: string
): Promise<SearchHit[]> => {
  if (!hit.text) return [hit]

  try {
    const response = await cachedCallSemanticFilter(description, intent, hit.text)
    if (!response || !hasMarkedSpans(response)) return []

    return extractMarkedSections(response.trim(), hit.file, hit.id)
  } catch (e) {
    console.error("[FILTER] failed for", hit.file, e)
    return []
  }
}

const buildFilterFn =
  (description: string, intent: string) =>
  (hit: SearchHit): Promise<SearchHit[]> =>
    filterOneHit(hit, description, intent)

export const streamFilterHits = async (
  hits: SearchHit[],
  description: string,
  intent: string,
  onHits: (hits: SearchHit[]) => void
): Promise<SearchHit[]> => {
  const { results } = await processPool(hits, buildFilterFn(description, intent), onHits, {
    concurrency: FILTER_CONCURRENCY,
  })
  return results
}
