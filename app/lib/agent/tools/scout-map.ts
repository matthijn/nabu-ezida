import { z } from "zod"
import { callLlm, toResponseFormat, extractText } from "../client"

export const ScoutSection = z.object({
  label: z.string().describe("Short name for this section"),
  start_line: z.number().int().min(1).describe("1-based first line of this section"),
  end_line: z.number().int().min(1).describe("1-based last line of this section"),
  desc: z.string().describe("Brief description of section contents"),
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

const buildContextMessage = (numbered: string, task: string, reason: string): string =>
  `<document>\n${numbered}\n</document>\n\nTask: ${task}\nFile purpose: ${reason}`

export const scoutFile = async (
  content: string,
  task: string,
  reason: string
): Promise<ScoutMap> => {
  const numbered = numberLines(content)

  const blocks = await callLlm({
    endpoint: SCOUT_ENDPOINT,
    messages: [
      { type: "message", role: "system", content: buildContextMessage(numbered, task, reason) },
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
