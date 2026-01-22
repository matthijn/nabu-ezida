import type { ToolCall, ToolDeps, Handler } from "./types"
import { toSnakeCase } from "~/lib/utils"
import * as handlers from "./handlers"

export type { ToolDeps }

const syntheticOk = async (): Promise<{ ok: true }> => ({ ok: true })

const buildHandlerMap = (fns: Record<string, Handler>): Record<string, Handler> =>
  Object.fromEntries(
    Object.entries(fns).map(([name, fn]) => [toSnakeCase(name), fn])
  )

const customHandlers = buildHandlerMap(handlers)

const orchestrationTools = new Set([
  "create_plan", "complete_step", "abort", "ask", "start_exploration", "exploration_step"
])

export const createToolExecutor = (deps: ToolDeps) => async (call: ToolCall): Promise<unknown> => {
  console.log("[Tool]", call)
  if (orchestrationTools.has(call.name)) return syntheticOk()

  const handler = customHandlers[call.name]
  if (handler) return handler(deps, call.args)

  return { error: `Unknown tool: ${call.name}` }
}
