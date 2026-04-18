import { z } from "zod"
import { callLlm, toResponseFormat, extractText } from "../client"

const ScoutFilterResponse = z.object({
  sections: z.array(z.number().int().min(0)),
})

const ENDPOINT = "/scout-filter"

const buildAnalysisMessage = (analysis: string): string => `# Analysis to apply\n\n${analysis}`

const buildSectionsMessage = (sections: string): string => `# Sections\n\n${sections}`

export const filterSections = async (analysis: string, sections: string): Promise<number[]> => {
  const blocks = await callLlm({
    endpoint: ENDPOINT,
    messages: [
      { type: "message", role: "system", content: buildAnalysisMessage(analysis) },
      { type: "message", role: "system", content: buildSectionsMessage(sections) },
      {
        type: "message",
        role: "user",
        content: "Return the indices of sections where the analysis plausibly applies.",
      },
    ],
    responseFormat: toResponseFormat(ScoutFilterResponse),
  })

  const text = extractText(blocks)
  if (!text) throw new Error("Scout filter returned empty response")

  const result = ScoutFilterResponse.safeParse(JSON.parse(text))
  if (!result.success) throw new Error(`Invalid scout filter response: ${result.error.message}`)

  return result.data.sections
}
