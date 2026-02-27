import type { ToolResult } from "../../types"
import { SegmentFileArgs, SegmentFileResponse } from "./segment-file.def"
import { registerSpecialHandler } from "../delegation"
import { callLlm, toResponseFormat, extractText } from "../../stream"
import { readFileProse, addLineNumbers } from "./file-content"

const SEGMENTER_ENDPOINT = "/segmenter"

const buildUserMessage = (numberedProse: string, splitBy: string): string =>
  `<document>\n${numberedProse}\n</document>\n\nSegment this document by: ${splitBy}`

const executeSegmentFile = async (call: { args: unknown }): Promise<ToolResult<unknown>> => {
  const parsed = SegmentFileArgs.safeParse(call.args)
  if (!parsed.success) return { status: "error", output: `Invalid args: ${parsed.error.message}` }

  const { file, split_by } = parsed.data

  const prose = readFileProse(file)
  if (!prose) return { status: "error", output: `${file}: empty or not found` }

  const numberedProse = addLineNumbers(prose)

  const blocks = await callLlm({
    endpoint: SEGMENTER_ENDPOINT,
    messages: [{ type: "message", role: "user", content: buildUserMessage(numberedProse, split_by) }],
    responseFormat: toResponseFormat(SegmentFileResponse),
  })

  const text = extractText(blocks)
  if (!text) return { status: "error", output: "Segmenter returned empty response" }

  const result = SegmentFileResponse.safeParse(JSON.parse(text))
  if (!result.success) return { status: "error", output: `Invalid segmenter response: ${result.error.message}` }

  if (result.data.error) return { status: "error", output: result.data.error }

  return { status: "ok", output: JSON.stringify(result.data) }
}

registerSpecialHandler("segment_file", executeSegmentFile)
