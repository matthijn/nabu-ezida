import { z } from "zod"
import type { AnyTool } from "../../executors/tool"

const ScoutFileEntry = z.object({
  path: z.string().describe("File path"),
  reason: z
    .string()
    .describe(
      "Why this file is relevant — what it will be used for (e.g. 'codebook to restructure', 'transcript to code')"
    ),
})

export const ScoutArgs = z.object({
  task: z.string().describe("What you intend to do — the user's request in your own words."),
  files: z.array(ScoutFileEntry).max(15).describe("Files involved in the task."),
})

export type ScoutFileEntry = z.infer<typeof ScoutFileEntry>

export const scoutTool: AnyTool = {
  name: "scout",
  description:
    "Scout files to understand their structure. Large files are mapped into sections with line ranges; small files are inlined.",
  schema: ScoutArgs,
}
