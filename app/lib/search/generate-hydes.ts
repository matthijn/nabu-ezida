import { z } from "zod"
import { callLlm, toResponseFormat, extractText } from "~/lib/agent/client"
import { cacheInStorage } from "~/lib/utils/storage-cache"

export type HydeResult = Record<string, string[]>

const HYDE_GENERATOR_ENDPOINT = "/hyde-generator"
const HYDES_PER_LANGUAGE = 3

export const buildHydeSchema = (languages: string[]): z.ZodType<HydeResult> =>
  z.object(
    Object.fromEntries(
      languages.map((lang) => [lang, z.array(z.string()).length(HYDES_PER_LANGUAGE)])
    )
  ) as z.ZodType<HydeResult>

const formatUserMessage = (description: string, languages: string[], query: string): string =>
  `- Project: ${description}\n- Languages: ${languages.join(", ")}\n- Query: ${query}`

const callHydeGenerator = async (
  description: string,
  languagesJoined: string,
  query: string
): Promise<HydeResult> => {
  const languages = languagesJoined.split("\0")
  const schema = buildHydeSchema(languages)

  const blocks = await callLlm({
    endpoint: HYDE_GENERATOR_ENDPOINT,
    messages: [
      { type: "message", role: "user", content: formatUserMessage(description, languages, query) },
    ],
    responseFormat: toResponseFormat(schema),
  })

  const text = extractText(blocks)
  if (!text) throw new Error("HyDE generator returned empty response")

  const result = schema.safeParse(JSON.parse(text))
  if (!result.success) throw new Error(`Invalid HyDE response: ${result.error.message}`)

  return result.data
}

const HYDE_CACHE_CAP = 1_000

const cachedCallHydeGenerator = cacheInStorage("hyde", callHydeGenerator, HYDE_CACHE_CAP)

export const generateHydes = (
  description: string,
  languages: string[],
  query: string,
  skipCache = false
): Promise<HydeResult> => {
  const call = skipCache ? callHydeGenerator : cachedCallHydeGenerator
  return call(description, languages.join("\0"), query)
}
