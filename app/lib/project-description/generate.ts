import { callLlm, extractText } from "~/lib/agent/client"
import type { LanguageSample } from "./sample"

const ENDPOINT = "/project-describer"

const formatSamples = (samples: LanguageSample[]): string =>
  samples
    .map(
      ({ language, passages }) =>
        `[${language}]\n${passages.map((p) => `- ${p.slice(0, 200)}`).join("\n")}`
    )
    .join("\n\n")

export const generateDescription = async (samples: LanguageSample[]): Promise<string> => {
  const blocks = await callLlm({
    endpoint: ENDPOINT,
    messages: [{ type: "message", role: "user", content: formatSamples(samples) }],
  })

  const text = extractText(blocks)
  if (!text) throw new Error("Project describer returned empty response")

  return text.trim()
}
