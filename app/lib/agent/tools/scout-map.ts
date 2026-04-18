import { z } from "zod"
import { callLlm, toResponseFormat, extractText } from "../client"

export const ScoutSection = z.object({
  label: z.string().describe("Short name for this section"),
  start_line: z.number().int().min(1).describe("1-based first line of this section"),
  end_line: z.number().int().min(1).describe("1-based last line of this section"),
  desc: z.string().optional().describe("Brief description of section contents"),
  keywords: z
    .array(z.string())
    .min(1)
    .max(6)
    .describe(
      "Key names, topics, and entities present in this section — no interpretation, just what's concretely there."
    ),
})

export const ScoutMapResponse = z.object({
  file_context: z
    .string()
    .describe("One-sentence summary of what the file contains and its format"),
  sections: z.array(ScoutSection),
})

export type ScoutSection = z.infer<typeof ScoutSection>
export type ScoutMap = z.infer<typeof ScoutMapResponse>

const SCOUT_ENDPOINT = "/scout-mapper"

const numberLines = (text: string): string =>
  text
    .split("\n")
    .map((line, i) => `${i + 1}: ${line}`)
    .join("\n")

const buildContextMessage = (numbered: string): string => `<document>\n${numbered}\n</document>`

export const scoutProse = async (prose: string): Promise<ScoutMap> => {
  const numbered = numberLines(prose)

  const blocks = await callLlm({
    endpoint: SCOUT_ENDPOINT,
    messages: [
      { type: "message", role: "system", content: buildContextMessage(numbered) },
      {
        type: "message",
        role: "user",
        content:
          "Return the section map as JSON. Every line in the document must belong to exactly one section.",
      },
    ],
    responseFormat: toResponseFormat(ScoutMapResponse),
  })

  const text = extractText(blocks)
  if (!text) throw new Error("Scout returned empty response")

  const result = ScoutMapResponse.safeParse(JSON.parse(text))
  if (!result.success) throw new Error(`Invalid scout response: ${result.error.message}`)

  return result.data
}
