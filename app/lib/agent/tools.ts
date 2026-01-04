import type { ToolCall } from "./types"
import { sendCommand, type Command } from "~/lib/api/client"
import { documentCommands } from "~/domain/api/commands/document"
import { projectCommands } from "~/domain/api/commands/project"
import type { QueryResult } from "~/lib/db/types"

type Args = Record<string, unknown>
type QueryFn = <T = unknown>(sql: string) => Promise<QueryResult<T>>

export type ToolDeps = {
  query?: QueryFn
}

const send = async (command: Command): Promise<unknown> => {
  const result = await sendCommand(command)
  return { success: true, event: result.result }
}

const syntheticOk = async (): Promise<{ ok: true }> => ({ ok: true })

type CommandFn = (args: Args) => Command

const commands: Record<string, CommandFn> = {
  ...(projectCommands as unknown as Record<string, CommandFn>),
  ...(documentCommands as unknown as Record<string, CommandFn>),
}

export const createToolExecutor = (deps: ToolDeps) => {
  return async (call: ToolCall): Promise<unknown> => {
    const orchestrationTools = ["create_plan", "complete_step", "abort", "start_exploration", "exploration_step"]
    if (orchestrationTools.includes(call.name)) {
      return syntheticOk()
    }

    if (call.name === "execute_sql") {
      if (!deps.query) return { error: "Database not available" }
      const result = await deps.query(call.args.sql as string)
      return { rows: result.rows, rowCount: result.rowCount }
    }

    const commandFn = commands[call.name]
    if (!commandFn) return { error: `Unknown tool: ${call.name}` }

    return send(commandFn(call.args))
  }
}
