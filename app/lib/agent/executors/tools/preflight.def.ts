import { z } from "zod"
import type { AnyTool } from "../tool"
import { approachKeys } from "~/domain/approaches"

const PreflightFileEntry = z.object({
  path: z.string().describe("File path"),
  reason: z.string().describe("Why this file is relevant — what it will be used for (e.g. 'codebook to restructure', 'transcript to code')"),
})

const approachesDescription = approachKeys.length > 0
  ? `Approach keys relevant to this task. Index files are included automatically. Available: ${approachKeys.join(", ")}`
  : "Approach keys relevant to this task. Index files are included automatically."

export const PreflightArgs = z.object({
  task: z.string().describe("What you intend to do — the user's request in your own words."),
  files: z.array(PreflightFileEntry).describe("Files involved in the task."),
  approaches: z.array(z.string()).describe(approachesDescription),
})

export type PreflightFileEntry = z.infer<typeof PreflightFileEntry>

export const preflightTool: AnyTool = {
  name: "preflight",
  description: "Prepare for planning. Pass the relevant files — large files are segmented into a table of contents automatically. Small files are inlined. Select approach keys to load task-specific playbooks.",
  schema: PreflightArgs,
}
