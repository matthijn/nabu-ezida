import type { ToolHandlers, ToolHandler } from "~/lib/llm"
import { sendCommand, type Command } from "~/lib/api/client"
import { documentCommands } from "~/domain/api/commands/document"
import { projectCommands } from "~/domain/api/commands/project"
import type { QueryResult } from "~/lib/db/types"

type Args = Record<string, unknown>
type QueryFn = <T = unknown>(sql: string) => Promise<QueryResult<T>>

type ToolHandlerDeps = {
  query?: QueryFn
}

const send = async (command: Command) => {
  const result = await sendCommand(command)
  return { success: true, event: result.result }
}

const h = (fn: (a: Args) => Promise<unknown>): ToolHandler => (args) => fn(args as Args)

export const createToolHandlers = (deps: ToolHandlerDeps = {}): ToolHandlers => ({
  // SQL
  executeSql: h(async (a) => {
    if (!deps.query) return { error: "Database not available" }
    const result = await deps.query(a.sql as string)
    return { rows: result.rows, rowCount: result.rowCount }
  }),

  // Project commands
  createProject: h(async (a) =>
    send(projectCommands.create(a.project_id as string, a.name as string, a.description as string))),

  updateProject: h(async (a) =>
    send(projectCommands.update(a.project_id as string, a.name as string, a.description as string))),

  pinProject: h(async (a) =>
    send(projectCommands.pin(a.project_id as string))),

  unpinProject: h(async (a) =>
    send(projectCommands.unpin(a.project_id as string))),

  deleteProject: h(async (a) =>
    send(projectCommands.delete(a.project_id as string))),

  // Document commands
  createDocument: h(async (a) =>
    send(documentCommands.create(a.document_id as string, a.project_id as string, a.name as string, a.description as string))),

  updateDocument: h(async (a) =>
    send(documentCommands.update(a.document_id as string, a.name as string, a.description as string))),

  pinDocument: h(async (a) =>
    send(documentCommands.pin(a.document_id as string))),

  unpinDocument: h(async (a) =>
    send(documentCommands.unpin(a.document_id as string))),

  deleteDocument: h(async (a) =>
    send(documentCommands.delete(a.document_id as string))),

  insertBlocks: h(async (a) =>
    send(documentCommands.insertBlocks(a.document_id as string, a.position as string, a.blocks as []))),

  deleteBlocks: h(async (a) =>
    send(documentCommands.deleteBlocks(a.document_id as string, a.block_ids as string[]))),

  replaceBlocks: h(async (a) =>
    send(documentCommands.replaceBlocks(a.document_id as string, a.block_ids as string[], a.blocks as []))),

  moveBlocks: h(async (a) =>
    send(documentCommands.moveBlocks(a.document_id as string, a.block_ids as string[], a.position as string))),

  replaceContent: h(async (a) =>
    send(documentCommands.replaceContent(a.document_id as string, a.content as []))),

  updateBlockProps: h(async (a) =>
    send(documentCommands.updateBlockProps(a.document_id as string, a.block_ids as string[], a.props as Record<string, unknown>))),

  addDocumentTags: h(async (a) =>
    send(documentCommands.addTags(a.document_id as string, a.tags as string[]))),

  removeDocumentTags: h(async (a) =>
    send(documentCommands.removeTags(a.document_id as string, a.tags as string[]))),

  addAnnotations: h(async (a) =>
    send(documentCommands.addAnnotations(a.document_id as string, a.annotations as []))),

  removeAnnotations: h(async (a) =>
    send(documentCommands.removeAnnotations(a.document_id as string, a.annotation_ids as string[]))),

  updateAnnotationProps: h(async (a) =>
    send(documentCommands.updateAnnotationProps(a.document_id as string, a.annotation_ids as string[], a.props as Record<string, unknown>))),
})
