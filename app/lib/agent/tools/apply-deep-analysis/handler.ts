import { z } from "zod"
import type { HandlerResult } from "../../types"
import { ApplyDeepAnalysisArgs, applyDeepAnalysisTool, type PostAction } from "./def"
import { registerTool, tool } from "../../executors/tool"
import { callLlm, extractText, toResponseFormat } from "../../client"
import { getFileView, getViewableFiles } from "../file-view"
import { getFile } from "~/lib/files"
import { getToolHandlers } from "../../executors/tool"
import {
  extractSection,
  numberSection,
  mapResults,
  toAnnotationOps,
  formatReturnOutput,
  formatAnnotateOutput,
  isAnnotateAction,
  type AnalysisResult,
} from "./format"

const DEEP_ANALYSIS_ENDPOINT = "/deep-analysis"

const BaseResultSchema = z.object({
  start: z.number().int().min(1),
  end: z.number().int().min(1),
  analysis_source_id: z.string(),
  reason: z.string(),
})

const ReviewableResultSchema = BaseResultSchema.extend({
  review: z.string().optional().describe("Flag for human review — explain what needs attention"),
})

const buildResponseSchema = (postAction: PostAction) =>
  z.object({
    results: z.array(postAction === "annotate_as_code" ? ReviewableResultSchema : BaseResultSchema),
  })

const REVIEW_GUIDANCE = [
  "When applying codes, flag an annotation for review if:",
  "- The passage fits but uneasily (stretched definition, partial match)",
  "- The passage is relevant to the codebook's themes but no existing code fits cleanly",
  "",
  'Flag sparingly. A flag means "this is a genuine codebook question worth the researcher\'s attention." Within any 20-60 line section, most annotations should not be flagged. If several are, the bar is too low — reconsider before flagging.',
  "",
  "Don't force-fit a wrong code, but also don't flag every imperfect fit. Apply the best-fitting code confidently when it's the right call; flag only when the fit itself raises a methodological question.",
].join("\n")

const buildSourceMessage = (paths: string[]): string => {
  const sections = paths.flatMap((p) => {
    const content = getFileView(p)
    if (content === undefined) return []
    return [`<source path="${p}">\n${content}\n</source>`]
  })
  return sections.join("\n\n")
}

const buildSectionMessage = (numbered: string): string => `<section>\n${numbered}\n</section>`

const buildMessages = (numbered: string, sourcePaths: string[], postAction: PostAction) => {
  const messages: { type: "message"; role: "system" | "user"; content: string }[] = [
    { type: "message", role: "system", content: buildSourceMessage(sourcePaths) },
    { type: "message", role: "system", content: buildSectionMessage(numbered) },
  ]
  if (postAction === "annotate_as_code") {
    messages.push({ type: "message", role: "system", content: REVIEW_GUIDANCE })
  }
  messages.push({
    type: "message",
    role: "user",
    content:
      "Analyze the numbered sentences against the source definitions. Return matching spans as JSON.",
  })
  return messages
}

const runAnalysis = async (
  numbered: string,
  sourcePaths: string[],
  postAction: PostAction
): Promise<AnalysisResult[]> => {
  const responseSchema = buildResponseSchema(postAction)
  const blocks = await callLlm({
    endpoint: DEEP_ANALYSIS_ENDPOINT,
    messages: buildMessages(numbered, sourcePaths, postAction),
    responseFormat: toResponseFormat(responseSchema),
  })

  const text = extractText(blocks)
  if (!text) return []

  const parsed = responseSchema.safeParse(JSON.parse(text))
  if (!parsed.success) return []

  return parsed.data.results
}

const applyAnnotations = async (
  path: string,
  ops: { op: string; item: unknown }[]
): Promise<HandlerResult<string>> => {
  const handler = getToolHandlers()["patch_annotations"]
  if (!handler)
    return { status: "error", output: "patch_annotations handler not registered", mutations: [] }

  const files = getViewableFiles()
  const result = await handler(files, { path, operations: ops })

  if (result.status === "error")
    return { status: "error", output: String(result.output), mutations: [] }

  return { status: result.status, output: String(result.output), mutations: result.mutations }
}

registerTool(
  tool({
    ...applyDeepAnalysisTool,
    schema: ApplyDeepAnalysisArgs,
    handler: async (_files, { path, start_line, end_line, source_files, post_action }) => {
      if (getFile(path) === undefined)
        return { status: "error", output: `File not found: ${path}`, mutations: [] }

      const missing = source_files.filter((p) => getFile(p) === undefined)
      if (missing.length > 0)
        return {
          status: "error",
          output: `Source files not found: ${missing.join(", ")}`,
          mutations: [],
        }

      const content = getFileView(path)
      if (content === undefined)
        return { status: "error", output: `Cannot read file: ${path}`, mutations: [] }

      const section = extractSection(content, start_line, end_line)
      const { sentences, numbered } = numberSection(section)

      if (sentences.length === 0)
        return { status: "ok", output: "Section contains no sentences.", mutations: [] }

      const rawResults = await runAnalysis(numbered, source_files, post_action)
      const mapped = mapResults(sentences, rawResults)

      if (post_action === "return") {
        return { status: "ok", output: formatReturnOutput(mapped), mutations: [] }
      }

      if (!isAnnotateAction(post_action)) {
        throw new Error(`unknown post_action: ${post_action}`)
      }

      if (mapped.length === 0) {
        return { status: "ok", output: formatAnnotateOutput(mapped, post_action), mutations: [] }
      }

      const ops = toAnnotationOps(mapped, post_action)
      const annotationResult = await applyAnnotations(path, ops)
      if (annotationResult.status === "error") return annotationResult

      return {
        status: "ok",
        output: formatAnnotateOutput(mapped, post_action),
        mutations: annotationResult.mutations,
      }
    },
  })
)
