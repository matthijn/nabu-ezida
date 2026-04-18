import { z } from "zod"

export const FileEntry = z.object({
  path: z.string().describe("File path"),
  group: z.string().describe('UI grouping label (e.g. "Transcript", "Codebook")'),
})

export type FileEntry = z.infer<typeof FileEntry>

export const TOO_MANY_FILES_NUDGE =
  "Looks like I pulled in too many files in one go for this system — what split should we do? Use the ask tool to propose a batching strategy to the user."
