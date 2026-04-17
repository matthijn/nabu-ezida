import { z } from "zod"
import { callLlm, extractText, toResponseFormat } from "~/lib/agent/client"

const ENDPOINT = "/topic-assigner"

export interface Classification {
  type: string
  source: string
  subject: string
}

export interface ExistingClassifications {
  types: string[]
  sources: string[]
  subjects: string[]
}

const ClassificationSchema = z.object({
  type: z.string().describe("document format, 1-3 words"),
  source: z.string().describe("who produced the document, 1-3 words"),
  subject: z.string().describe("topic of the document, 3-5 words"),
})

const formatList = (items: string[]): string =>
  items.length === 0 ? "(none yet)" : items.join(", ")

const buildExistingMessage = (existing: ExistingClassifications): string =>
  `Existing types: ${formatList(existing.types)}\nExisting sources: ${formatList(existing.sources)}\nExisting subjects: ${formatList(existing.subjects)}`

const CALL_TO_ACTION = "Classify this document."

const toSystem = (content: string) => ({
  type: "message" as const,
  role: "system" as const,
  content,
})

const lowercaseClassification = (c: Classification): Classification => ({
  type: c.type.toLowerCase(),
  source: c.source.toLowerCase(),
  subject: c.subject.toLowerCase(),
})

export const classifyDocument = async (
  excerpt: string,
  existing: ExistingClassifications
): Promise<Classification | null> => {
  const blocks = await callLlm({
    endpoint: ENDPOINT,
    messages: [
      toSystem(buildExistingMessage(existing)),
      toSystem(excerpt),
      toSystem(CALL_TO_ACTION),
    ],
    responseFormat: toResponseFormat(ClassificationSchema),
  })

  const text = extractText(blocks)
  if (!text) {
    console.warn("[classify] empty LLM response")
    return null
  }

  const parsed = ClassificationSchema.safeParse(JSON.parse(text))
  if (!parsed.success) {
    console.warn(`[classify] failed to parse response — ${parsed.error.message}, raw: ${text}`)
    return null
  }

  return lowercaseClassification(parsed.data)
}
