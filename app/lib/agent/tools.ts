import type { ToolCall, ToolDeps, Handler } from "./types"
import { toSnakeCase } from "~/lib/utils"
import * as handlers from "./handlers"

export type { ToolDeps }

const buildHandlerMap = (fns: Record<string, Handler>): Record<string, Handler> =>
  Object.fromEntries(
    Object.entries(fns).map(([name, fn]) => [toSnakeCase(name), fn])
  )

const handlerMap = buildHandlerMap(handlers)

export const createToolExecutor = (deps: ToolDeps) => async (call: ToolCall): Promise<unknown> => {
  console.log("[Tool]", call)

  const handler = handlerMap[call.name]
  if (handler) return handler(deps, call.args)

  return { error: `Unknown tool: ${call.name}` }
}
