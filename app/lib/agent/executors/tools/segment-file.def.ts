import { z } from "zod"
import type { AnyTool } from "../tool"

const SegmentFileArgs = z.object({
  file: z.string().min(1).describe("File path to segment"),
  split_by: z.string().describe("Criterion for segmentation (e.g. 'topic', 'argument', 'theme')"),
})

export const SegmentFileResponse = z.object({
  sections: z.array(z.object({
    start: z.number().describe("Start line number (1-based)"),
    end: z.number().describe("End line number (1-based)"),
    desc: z.string().describe("Brief description of the section"),
  })),
  file_context: z.string().describe("One-sentence summary of the entire file"),
  error: z.string().nullable().optional().describe("Set when the file cannot be segmented (e.g. binary, empty, incompatible with criterion)"),
})

export const segmentFileTool: AnyTool = {
  name: "segment_file",
  description: "Segment a file into sections by a given criterion. Returns line ranges with descriptions. Use read_section to inspect individual sections.",
  schema: SegmentFileArgs,
}

export { SegmentFileArgs }
