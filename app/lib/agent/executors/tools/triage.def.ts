import { z } from "zod"
import type { AnyTool } from "../tool"

const TriageFileEntry = z.object({
  path: z.string().describe("File path"),
  reason: z.string().describe("Why this file is relevant — what it will be used for (e.g. 'codebook to restructure', 'transcript to code')"),
})

export const TriageArgs = z.object({
  task: z.string().describe("What you intend to do — the user's request in your own words."),
  files: z.array(TriageFileEntry).describe("Files involved in the task."),
})

export type TriageFileEntry = z.infer<typeof TriageFileEntry>

export const triageTool: AnyTool = {
  name: "triage",
  description: "Assess a task and prepare for planning. Pass the relevant files — large files are segmented into a table of contents automatically. Small files are inlined.",
  schema: TriageArgs,
}
