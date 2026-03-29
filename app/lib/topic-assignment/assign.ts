import { callLlm, extractText, type Block } from "~/lib/agent/client"

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

const parseField = (text: string, field: string): string | null => {
  const pattern = new RegExp(`^${field}:\\s*(.+)$`, "mi")
  const match = text.match(pattern)
  return match ? match[1].trim() : null
}

const parseClassification = (text: string): Classification | null => {
  const type = parseField(text, "type")
  const source = parseField(text, "source")
  const subject = parseField(text, "subject")
  if (!type || !source || !subject) return null
  return { type: type.toLowerCase(), source: source.toLowerCase(), subject: subject.toLowerCase() }
}

const formatList = (items: string[]): string =>
  items.length === 0 ? "(none yet)" : items.join(", ")

const buildExistingMessage = (existing: ExistingClassifications): string =>
  `Existing types: ${formatList(existing.types)}\nExisting sources: ${formatList(existing.sources)}\nExisting subjects: ${formatList(existing.subjects)}`

const buildConfirmation = (): string =>
  `Classify this document. Pick from existing labels when they fit well, create new ones when they don't. Output only the three fields.`

const summarizeBlocks = (blocks: Block[]): string =>
  blocks.map((b) => `${b.type}${b.type === "text" ? `(${b.content.length}ch)` : ""}`).join(", ")

export const classifyDocument = async (
  excerpt: string,
  existing: ExistingClassifications
): Promise<Classification | null> => {
  const blocks = await callLlm({
    endpoint: ENDPOINT,
    messages: [
      { type: "message", role: "system", content: buildExistingMessage(existing) },
      { type: "message", role: "system", content: excerpt },
      { type: "message", role: "system", content: buildConfirmation() },
    ],
  })

  const text = extractText(blocks)
  if (!text) {
    console.warn(`[classify] empty LLM response, blocks: [${summarizeBlocks(blocks)}]`)
    return null
  }

  const result = parseClassification(text)
  if (!result) {
    const type = parseField(text, "type")
    const source = parseField(text, "source")
    const subject = parseField(text, "subject")
    console.warn(
      `[classify] failed to parse response — type: ${type}, source: ${source}, subject: ${subject}, raw: ${text}`
    )
    return null
  }

  return result
}
