import { z } from "zod"
import type { Block } from "../types"
import { tool, registerTool, ok, err } from "./tool"
import { prompt } from "../stream"
import { startInterpretEntry, updateInterpretStreaming, updateInterpretReasoning, completeInterpretEntry } from "./interpret-store"
import { AnnotationSuggestionSchema, type AnnotationSuggestion } from "~/domain/attributes/schema"

const CodebookResultSchema = z.object({
  suggestions: z.array(AnnotationSuggestionSchema),
})

export type CodebookResult = z.infer<typeof CodebookResultSchema>
export type { AnnotationSuggestion }

const promptSchemas: Record<string, z.ZodType> = {
  "with-codebook": CodebookResultSchema,
}

export const getPromptSchema = (type: string): z.ZodType | undefined => promptSchemas[type]

const ThinkingMode = z.enum(["with-codebook"])

const buildMessages = (context: string, content: string): Block[] => [
  { type: "system", content: context },
  { type: "user", content },
]

const extractText = (blocks: Block[]): string => {
  const textBlock = blocks.find((b) => b.type === "text")
  return textBlock?.type === "text" ? textBlock.content : ""
}

export async function interpretContent<T extends z.ZodType>(
  context: string,
  content: string,
  promptType: string,
  schema: T
): Promise<z.infer<T>>
export async function interpretContent(
  context: string,
  content: string,
  promptType: string,
  schema?: undefined
): Promise<string>
export async function interpretContent<T extends z.ZodType>(
  context: string,
  content: string,
  promptType: string,
  schema?: T
): Promise<z.infer<T> | string> {
  const messages = buildMessages(context, content)
  const entryId = startInterpretEntry(messages)

  const callbacks = {
    onChunk: (chunk: string) => updateInterpretStreaming(entryId, chunk),
    onReasoningChunk: (chunk: string) => updateInterpretReasoning(entryId, chunk),
  }

  const endpoint = `/interpret/${promptType}`

  if (schema) {
    const result = await prompt({ endpoint, messages, schema, callbacks })
    completeInterpretEntry(entryId, [{ type: "text", content: JSON.stringify(result, null, 2) }])
    return result
  }

  const blocks = await prompt({ endpoint, messages, callbacks })
  completeInterpretEntry(entryId, blocks)
  return extractText(blocks)
}

const ThinkHardArgs = z.object({
  lens: z.string().min(1).describe("Path to file providing the thinking perspective (e.g., codebook)"),
  mode: ThinkingMode.describe("How to think about the content"),
  about: z.string().min(1).describe("The content to think about"),
})

export const thinkHard = registerTool(
  tool({
    name: "think_hard",
    description: `Think deeply about content using a file as the thinking lens.

The lens file provides the perspective/framework (e.g., a codebook), and the content is what gets analyzed.`,
    schema: ThinkHardArgs,
    handler: async (files, { lens, mode, about }) => {
      const lensContent = files.get(lens)
      if (!lensContent) return err(`${lens}: No such file`)

      const schema = promptSchemas[mode]

      try {
        const result = await interpretContent(lensContent, about, mode, schema)
        return ok(typeof result === "string" ? result : JSON.stringify(result, null, 2))
      } catch (e) {
        return err(e instanceof Error ? e.message : String(e))
      }
    },
  })
)
