import { z } from "zod"

const ReadSectionArgs = z.object({
  file: z.string().min(1).describe("File path to read from"),
  start: z.number().int().describe("Start line number (1-based, inclusive)"),
  end: z.number().int().describe("End line number (1-based, inclusive)"),
  annotations: z.boolean().optional().default(false).describe("Include annotations that overlap with the slice"),
})

export const readSectionTool = {
  name: "read_section" as const,
  description: "Read a line range from a file, with optional annotations. Use after segment_file to inspect a specific section.",
  schema: ReadSectionArgs,
}
