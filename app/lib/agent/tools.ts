import type { ToolCall, ToolDeps, Handler } from "./types"
import { send, type Command } from "~/lib/api/client"
import { documentCommands } from "~/domain/api/commands/document"
import { toSnakeCase } from "~/lib/utils"
import * as handlers from "./handlers"

export type { ToolDeps }

type Args = Record<string, unknown>

const syntheticOk = async (): Promise<{ ok: true }> => ({ ok: true })

const withProjectId = (args: Args, projectId: string): Args => ({
  ...args,
  project_id: projectId,
})

const buildHandlerMap = (fns: Record<string, Handler>): Record<string, Handler> =>
  Object.fromEntries(
    Object.entries(fns).map(([name, fn]) => [toSnakeCase(name), fn])
  )

const customHandlers = buildHandlerMap(handlers)

const orchestrationTools = new Set([
  "create_plan", "complete_step", "abort", "start_exploration", "exploration_step"
])

const commands: Record<string, (args: Args) => Command> = {
  ...(documentCommands as unknown as Record<string, (args: Args) => Command>),
}

export const createToolExecutor = (deps: ToolDeps) => async (call: ToolCall): Promise<unknown> => {
  if (orchestrationTools.has(call.name)) return syntheticOk()

  const handler = customHandlers[call.name]
  if (handler) return handler(deps, call.args)

  const commandFn = commands[call.name]
  if (!commandFn) return { error: `Unknown tool: ${call.name}` }

  const args = deps.project ? withProjectId(call.args, deps.project.id) : call.args
  return send(commandFn(args))
}
