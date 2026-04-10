import { z } from "zod"
import type { AnyTool } from "../../executors/tool"

const ScoutFileEntry = z.object({
  path: z.string().describe("File path"),
  reason: z
    .string()
    .describe(
      "Why this file is relevant — what it will be used for (e.g. 'codebook to restructure', 'transcript to code')"
    ),
  group: z.string().describe('UI grouping label (e.g. "Transcript", "Codebook")'),
})

export const ScoutArgs = z.object({
  task: z.string().describe("What you intend to do — the user's request in your own words."),
  files: z.array(ScoutFileEntry).max(15).describe("Files involved in the task."),
})

export type ScoutFileEntry = z.infer<typeof ScoutFileEntry>

export const scoutTool: AnyTool = {
  name: "scout",
  description:
    "Load files and map their prose into sections with line ranges for a planner to work through. Small files are inlined.",
  schema: ScoutArgs,
}
