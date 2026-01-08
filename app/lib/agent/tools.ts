import type { ToolCall } from "./types"
import { sendCommand, type Command } from "~/lib/api/client"
import { documentCommands } from "~/domain/api/commands/document"
import { projectCommands } from "~/domain/api/commands/project"
import type { QueryResult } from "~/lib/db/types"
import type { Project } from "~/domain/project"
import { selectBlockIdsForDocument } from "~/domain/project"
import type { Block } from "~/domain/document"

type Args = Record<string, unknown>
type QueryFn = <T = unknown>(sql: string) => Promise<QueryResult<T>>

export type ToolDeps = {
  query?: QueryFn
  project?: Project
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

const executeReplaceContent = async (
  project: Project,
  documentId: string,
  content: Block[]
): Promise<unknown> => {
  const blockIds = selectBlockIdsForDocument(project, documentId)

  if (blockIds.length > 0) {
    await send(documentCommands.delete_blocks({ document_id: documentId, block_ids: blockIds }))
  }

  if (content.length > 0) {
    await send(documentCommands.insert_blocks({ document_id: documentId, position: "head", blocks: content }))
  }

  return { success: true, replaced: { deleted: blockIds.length, inserted: content.length } }
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

    if (call.name === "replace_content") {
      if (!deps.project) return { error: "Project not available" }
      const documentId = call.args.document_id as string
      const content = call.args.content as Block[]
      return executeReplaceContent(deps.project, documentId, content)
    }

    const commandFn = commands[call.name]
    if (!commandFn) return { error: `Unknown tool: ${call.name}` }

    return send(commandFn(call.args))
  }
}
