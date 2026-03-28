import { z } from "zod"
import { callLlm, extractText, toResponseFormat } from "~/lib/agent/client"

const ENDPOINT = "/project-describer"

const DescriptionSchema = z.object({
  domain: z.string(),
  topics: z.array(z.string()).length(5),
})

type Description = z.infer<typeof DescriptionSchema>

export const normalizeDescription = (desc: Description): string => {
  const domain = desc.domain.toLowerCase().trim()
  const topics = desc.topics.map((t) => t.toLowerCase().trim()).sort()
  return `${domain}\n${topics.join(", ")}`
}

const formatSamples = (passages: string[]): string => passages.map((p) => `- ${p}`).join("\n")

export const generateDescription = async (passages: string[]): Promise<string> => {
  const blocks = await callLlm({
    endpoint: ENDPOINT,
    messages: [{ type: "message", role: "user", content: formatSamples(passages) }],
    responseFormat: toResponseFormat(DescriptionSchema),
  })

  const text = extractText(blocks)
  if (!text) throw new Error("Project describer returned empty response")

  const parsed = DescriptionSchema.safeParse(JSON.parse(text))
  if (!parsed.success) throw new Error(`Invalid description: ${parsed.error.message}`)

  return normalizeDescription(parsed.data)
}
