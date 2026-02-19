import { z } from "zod"
import type { AnyTool } from "../tool"

export const forEachTool: AnyTool = {
  name: "for_each",
  description: "Apply the same task to each file independently with full conversation context. Each file is processed in a fresh branch that sees the full history plus accumulated results from prior files. Use when you need to do the same work across multiple files.",
  schema: z.object({
    files: z.array(z.string()).describe("File paths to process, one per branch."),
    task: z.string().describe("What to do with each file. The branch receives the file content, its annotations, and all prior branch results."),
  }),
}

export const ForEachArgs = z.object({
  files: z.array(z.string()),
  task: z.string(),
})
