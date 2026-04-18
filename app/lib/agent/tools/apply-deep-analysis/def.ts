import { z } from "zod"
import type { AnyTool } from "../../executors/tool"

export const PostAction = z.enum(["return", "annotate_as_code", "annotate_as_comment"])

export type PostAction = z.infer<typeof PostAction>

export const ApplyDeepAnalysisArgs = z.object({
  path: z.string().describe("File to analyze"),
  start_line: z
    .number()
    .int()
    .min(1)
    .describe("First line of the section (1-based, from scout map)"),
  end_line: z.number().int().min(1).describe("Last line of the section (1-based, from scout map)"),
  source_files: z
    .array(z.string())
    .min(1)
    .describe("Paths to files containing analysis definitions / criteria"),
  post_action: PostAction.describe(
    "return: get results. annotate_as_code: write code annotations (analysis_source_id = code id). annotate_as_comment: write comment annotations."
  ),
})

export type ApplyDeepAnalysisArgs = z.infer<typeof ApplyDeepAnalysisArgs>

export const applyDeepAnalysisTool: AnyTool = {
  name: "apply_deep_analysis",
  description:
    "Run deep analysis on one file section against source criteria. Returns structured results or writes annotations depending on post_action.\n\nparallel: yes — each call handles one section independently",
  schema: ApplyDeepAnalysisArgs,
}
