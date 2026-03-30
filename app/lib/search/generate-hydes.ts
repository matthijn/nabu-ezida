import { z } from "zod"
import { callLlm, toResponseFormat, extractText } from "~/lib/agent/client"
import { cacheInStorage } from "~/lib/utils/storage-cache"

export type HydeResult = Record<string, string[]>

const HYDE_GENERATOR_ENDPOINT = "/hyde-generator"
const HYDES_PER_GROUP_ENGLISH = 2
const HYDES_PER_GROUP_OTHER = 1
const DEFAULT_LANGUAGE = "eng"

const hydesPerGroup = (language: string): number =>
  language === DEFAULT_LANGUAGE ? HYDES_PER_GROUP_ENGLISH : HYDES_PER_GROUP_OTHER

export const buildHydeSchema = (groups: string[], count: number): z.ZodType<HydeResult> =>
  z.object(
    Object.fromEntries(
      groups.map((group) => [
        group,
        z.union([z.array(z.string()).length(count), z.array(z.string()).length(0)]),
      ])
    )
  ) as z.ZodType<HydeResult>

const toSystem = (content: string) => ({
  type: "message" as const,
  role: "system" as const,
  content,
})

const formatCorpusMessage = (tree: string): string => `corpus:\n${tree}`

const formatQueryMessage = (language: string, query: string): string =>
  `language: ${language}\nquery: ${query}`

const formatCallToAction = (count: number): string =>
  `Generate ${count} hypothetical passage(s) per relevant group. Skip irrelevant groups with an empty array.`

export const extractGroups = (tree: string): string[] =>
  tree.split("\n").filter((line) => !line.startsWith("  ") && line.length > 0)

const callHydeGenerator = async (
  tree: string,
  language: string,
  query: string
): Promise<HydeResult> => {
  const groups = extractGroups(tree)
  const count = hydesPerGroup(language)
  const schema = buildHydeSchema(groups, count)

  const blocks = await callLlm({
    endpoint: HYDE_GENERATOR_ENDPOINT,
    messages: [
      toSystem(formatCorpusMessage(tree)),
      toSystem(formatQueryMessage(language, query)),
      toSystem(formatCallToAction(count)),
    ],
    responseFormat: toResponseFormat(schema),
  })

  const text = extractText(blocks)
  if (!text) throw new Error("HyDE generator returned empty response")

  const parsed = JSON.parse(text)
  const result: HydeResult = {}
  for (const [key, value] of Object.entries(parsed)) {
    if (Array.isArray(value) && value.length > 0) result[key] = value as string[]
  }

  return result
}

const HYDE_CACHE_CAP = 1_000

const cachedCallHydeGenerator = cacheInStorage("hyde", callHydeGenerator, HYDE_CACHE_CAP)

export const generateHydes = (
  tree: string,
  language: string,
  query: string,
  skipCache = false
): Promise<HydeResult> => {
  const call = skipCache ? callHydeGenerator : cachedCallHydeGenerator
  return call(tree, language, query)
}
