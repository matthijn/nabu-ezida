import { z } from "zod"
import { callLlm, toResponseFormat, extractText } from "../../stream"

export const SegmentFileResponse = z.object({
  sections: z.array(z.object({
    first_line: z.string().describe("Exact first line of this section, copied verbatim from the document"),
    last_line: z.string().describe("Exact last line of this section, copied verbatim from the document"),
    group: z.string().describe("Group this section belongs to (empty string if none)"),
    desc: z.string().describe("Brief description of what the section contains"),
  })),
  file_context: z.string().describe("One-sentence summary of what the file contains and its format"),
})

export type SegmentResult = z.infer<typeof SegmentFileResponse>

const SEGMENTER_ENDPOINT = "/segmenter"

const buildUserMessage = (prose: string, instruction: string): string =>
  `<document>\n${prose}\n</document>\n\n${instruction}`

export const segmentContent = async (prose: string, instruction: string): Promise<SegmentResult> => {
  const blocks = await callLlm({
    endpoint: SEGMENTER_ENDPOINT,
    messages: [{ type: "message", role: "user", content: buildUserMessage(prose, instruction) }],
    responseFormat: toResponseFormat(SegmentFileResponse),
  })

  const text = extractText(blocks)
  if (!text) throw new Error("Segmenter returned empty response")

  const result = SegmentFileResponse.safeParse(JSON.parse(text))
  if (!result.success) throw new Error(`Invalid segmenter response: ${result.error.message}`)

  return result.data
}
