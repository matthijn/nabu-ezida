import { z } from "zod"
import { callLlm, toResponseFormat, extractText } from "~/lib/agent/client"

export const LensResultSchema = z.object({
  direct: z.string().describe("The topic itself as a short search query"),
  cause: z.string().nullable().describe("Why does it happen?"),
  effect: z.string().nullable().describe("What follows from it?"),
  observable: z.string().nullable().describe("What would someone concretely see or experience?"),
  contrast: z.string().nullable().describe("What changed compared to before?"),
})

export type LensResult = z.infer<typeof LensResultSchema>

const LENS_GENERATOR_ENDPOINT = "/lens-generator"

export const extractLenses = (data: LensResult): string[] =>
  Object.values(data).filter((v): v is string => v !== null)

export const generateLenses = async (description: string): Promise<string[]> => {
  const blocks = await callLlm({
    endpoint: LENS_GENERATOR_ENDPOINT,
    messages: [{ type: "message", role: "user", content: description }],
    responseFormat: toResponseFormat(LensResultSchema),
  })

  const text = extractText(blocks)
  if (!text) throw new Error("Lens generator returned empty response")

  const result = LensResultSchema.safeParse(JSON.parse(text))
  if (!result.success) throw new Error(`Invalid lens response: ${result.error.message}`)

  return extractLenses(result.data)
}
