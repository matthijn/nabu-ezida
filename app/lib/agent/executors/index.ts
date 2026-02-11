import type { ToolCall, ToolDeps, ToolResult } from "../types"
import { getToolHandlers, getToolDefinitions } from "./tool"
import { extractFiles, resolveOpPlaceholders, applyMutation } from "./execute"

// Import tools to register them
import "./patch"
import "./orientation"
import "./shell"
import "./json-patch"
import "./remove-block"

export type { ToolDeps }
export { getToolDefinitions }

export const createToolExecutor = (deps: ToolDeps) => async (call: ToolCall): Promise<ToolResult<unknown>> => {
  const handlers = getToolHandlers()
  const handler = handlers[call.name]
  if (!handler) {
    return { status: "error", output: `Unknown tool: ${call.name}` }
  }

  const files = extractFiles()
  const { status, output, mutations } = await handler(files, call.args)

  const mutationOutputs: string[] = []
  for (const op of mutations) {
    const { op: resolved, placeholderIds } = resolveOpPlaceholders(op)
    const result = applyMutation(resolved, placeholderIds)
    if (result.status === "error") {
      return result
    }
    mutationOutputs.push(result.output)
  }

  const finalOutput = mutationOutputs.length > 0 ? mutationOutputs.join("\n") : output
  return { status, output: finalOutput } as ToolResult<unknown>
}
