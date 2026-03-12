import { z } from "zod"
import type { AnyTool } from "../tool"

const PreflightFileEntry = z.object({
  path: z.string().describe("File path"),
  reason: z.string().describe("Why this file is relevant — what it will be used for (e.g. 'codebook to restructure', 'transcript to code')"),
})

export const PreflightArgs = z.object({
  task: z.string().describe("What you intend to do — the user's request in your own words."),
  files: z.array(PreflightFileEntry).describe("Files involved in the task."),
})

export type PreflightFileEntry = z.infer<typeof PreflightFileEntry>

export const preflightTool: AnyTool = {
  name: "preflight",
  description: "Prepare for planning. Pass the relevant files — large files are segmented into a table of contents automatically. Small files are inlined.",
  schema: PreflightArgs,
}
