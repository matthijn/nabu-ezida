import { z } from "zod"
import type { Block } from "../types"
import { tool, registerTool, ok, err } from "./tool"
import { prompt } from "../stream"
import { startInterpretEntry, updateInterpretStreaming, updateInterpretReasoning, completeInterpretEntry } from "./interpret-store"

const Confidence = z.enum(["low", "medium", "high"])

const InterpretedAnnotation = z.object({
  text: z.string().describe("Exact text from the document being annotated"),
  reason: z.string().describe("Why this text was coded this way"),
  code: z.string().describe("The code ID from the codebook"),
  ambiguity: z.string().optional().describe("Why the interpretation is uncertain"),
  confidence: Confidence.describe("How confident the interpretation is"),
  deleteSuggested: z.boolean().describe("Whether this annotation should be removed"),
})

const CodebookAnnotationSchema = z.object({
  annotations: z.array(InterpretedAnnotation),
})

const promptSchemas: Record<string, z.ZodType> = {
  "with-codebook": CodebookAnnotationSchema,
}

const PromptType = z.enum(["with-codebook"])

const buildMessages = (context: string, content: string): Block[] => [
  { type: "system", content: context },
  { type: "user", content },
]

const extractText = (blocks: Block[]): string => {
  const textBlock = blocks.find((b) => b.type === "text")
  return textBlock?.type === "text" ? textBlock.content : ""
}

export const interpretContent = async <T extends z.ZodType>(
  context: string,
  content: string,
  promptType: string,
  schema?: T
): Promise<T extends z.ZodType ? z.infer<T> : string> => {
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
  return extractText(blocks) as T extends z.ZodType ? z.infer<T> : string
}

const InterpretWithFileArgs = z.object({
  file: z.string().min(1).describe("Path to the file that provides context for interpretation"),
  prompt_type: PromptType.describe("The type of interpretation to perform"),
  content: z.string().min(1).describe("The content to interpret"),
})

export const interpretWithFile = registerTool(
  tool({
    name: "interpret_with_file",
    description: `Interpret content using a file as context and a predefined interpretation framework.

The file provides the interpretation lens (e.g., a codebook), and the content is what gets interpreted.`,
    schema: InterpretWithFileArgs,
    handler: async (files, { file, prompt_type, content }) => {
      const fileContent = files.get(file)
      if (!fileContent) return err(`${file}: No such file`)

      const schema = promptSchemas[prompt_type]

      try {
        const result = await interpretContent(fileContent, content, prompt_type, schema)
        return ok(typeof result === "string" ? result : JSON.stringify(result, null, 2))
      } catch (e) {
        return err(e instanceof Error ? e.message : String(e))
      }
    },
  })
)
