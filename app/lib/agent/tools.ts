import type { ToolCall } from "./types"
import { sendCommand, type Command } from "~/lib/api/client"
import { documentCommands } from "~/domain/api/commands/document"
import { projectCommands } from "~/domain/api/commands/project"
import type { QueryResult } from "~/lib/db/types"

type Args = Record<string, unknown>
type QueryFn = <T = unknown>(sql: string) => Promise<QueryResult<T>>
type ToolExecutor = (args: Args) => Promise<unknown>

export type ToolDeps = {
  query?: QueryFn
}

const send = async (command: Command): Promise<unknown> => {
  const result = await sendCommand(command)
  return { success: true, event: result.result }
}

const syntheticOk = async (): Promise<{ ok: true }> => ({ ok: true })

const executors = (deps: ToolDeps): Record<string, ToolExecutor> => ({
  create_plan: syntheticOk,
  complete_step: syntheticOk,

  execute_sql: async (a) => {
    if (!deps.query) return { error: "Database not available" }
    const result = await deps.query(a.sql as string)
    return { rows: result.rows, rowCount: result.rowCount }
  },

  create_project: async (a) =>
    send(projectCommands.create(a.project_id as string, a.name as string, a.description as string)),

  update_project: async (a) =>
    send(projectCommands.update(a.project_id as string, a.name as string, a.description as string)),

  pin_project: async (a) =>
    send(projectCommands.pin(a.project_id as string)),

  unpin_project: async (a) =>
    send(projectCommands.unpin(a.project_id as string)),

  delete_project: async (a) =>
    send(projectCommands.delete(a.project_id as string)),

  create_document: async (a) =>
    send(documentCommands.create(a.document_id as string, a.project_id as string, a.name as string, a.description as string)),

  update_document: async (a) =>
    send(documentCommands.update(a.document_id as string, a.name as string, a.description as string)),

  pin_document: async (a) =>
    send(documentCommands.pin(a.document_id as string)),

  unpin_document: async (a) =>
    send(documentCommands.unpin(a.document_id as string)),

  delete_document: async (a) =>
    send(documentCommands.delete(a.document_id as string)),

  insert_blocks: async (a) =>
    send(documentCommands.insertBlocks(a.document_id as string, a.position as string, a.blocks as [])),

  delete_blocks: async (a) =>
    send(documentCommands.deleteBlocks(a.document_id as string, a.block_ids as string[])),

  replace_blocks: async (a) =>
    send(documentCommands.replaceBlocks(a.document_id as string, a.block_ids as string[], a.blocks as [])),

  move_blocks: async (a) =>
    send(documentCommands.moveBlocks(a.document_id as string, a.block_ids as string[], a.position as string)),

  replace_content: async (a) =>
    send(documentCommands.replaceContent(a.document_id as string, a.content as [])),

  update_block_props: async (a) =>
    send(documentCommands.updateBlockProps(a.document_id as string, a.block_ids as string[], a.props as Record<string, unknown>)),

  add_document_tags: async (a) =>
    send(documentCommands.addTags(a.document_id as string, a.tags as string[])),

  remove_document_tags: async (a) =>
    send(documentCommands.removeTags(a.document_id as string, a.tags as string[])),

  add_annotations: async (a) =>
    send(documentCommands.addAnnotations(a.document_id as string, a.annotations as [])),

  remove_annotations: async (a) =>
    send(documentCommands.removeAnnotations(a.document_id as string, a.annotation_ids as string[])),

  update_annotation_props: async (a) =>
    send(documentCommands.updateAnnotationProps(a.document_id as string, a.annotation_ids as string[], a.props as Record<string, unknown>)),
})

export const createToolExecutor = (deps: ToolDeps) => {
  const exec = executors(deps)

  return async (call: ToolCall): Promise<unknown> => {
    const executor = exec[call.name]
    if (!executor) return { error: `Unknown tool: ${call.name}` }
    return executor(call.args)
  }
}
