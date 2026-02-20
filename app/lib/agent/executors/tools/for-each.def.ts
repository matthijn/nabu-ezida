import { z } from "zod"
import type { AnyTool } from "../tool"

export const forEachTool: AnyTool = {
  name: "for_each",
  description: "Load multiple files into context for sequential processing. Each file's content and annotations are injected as context.",
  schema: z.object({
    files: z.array(z.string()).describe("File paths to process sequentially."),
    task: z.string().describe("What to do with each file."),
  }),
}

export const ForEachArgs = z.object({
  files: z.array(z.string()),
  task: z.string(),
})
