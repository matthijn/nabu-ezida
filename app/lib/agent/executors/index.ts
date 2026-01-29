import type { ToolCall, ToolDeps, Handler, ToolResult, Operation } from "../types"
import { getFiles, getFileRaw, updateFileRaw, deleteFile, renameFile, applyFilePatch } from "~/lib/files"
import { sendCommand, type Command, type Action } from "~/lib/sync"
import { patchHandler } from "./patch"
import { createPlan, completeStep, abort, startExploration, explorationStep } from "./orchestration"
import { shellHandler } from "./shell"

export type { ToolDeps }

export const createToolExecutor = (deps: ToolDeps) => async (call: ToolCall): Promise<ToolResult<unknown>> => {
  const handler = handlers[call.name]
  if (!handler) {
    return { status: "error", output: `Unknown tool: ${call.name}` }
  }

  const files = extractFiles()
  const { status, output, mutations } = await handler(files, call.args)

  for (const op of mutations) {
    const result = applyMutation(op)
    if (result.status === "error") {
      return result
    }
    if (deps.project?.id) {
      persistToServer(deps.project.id, op)
    }
  }

  return { status, output } as ToolResult<unknown>
}

const handlers: Record<string, Handler> = {
  apply_local_patch: patchHandler,
  create_plan: createPlan,
  complete_step: completeStep,
  abort,
  start_exploration: startExploration,
  exploration_step: explorationStep,
  run_local_shell: shellHandler,
}

const extractFiles = (): Map<string, string> =>
  new Map(Object.entries(getFiles()))

const applyMutation = (op: Operation): ToolResult<string> => {
  switch (op.type) {
    case "create_file": {
      if (getFileRaw(op.path)) return { status: "error", output: `${op.path}: already exists` }
      return applyPatchAndStore(op.path, "", op.diff, "Created")
    }
    case "update_file": {
      const content = getFileRaw(op.path)
      if (!content) return { status: "error", output: `${op.path}: No such file` }
      return applyPatchAndStore(op.path, content, op.diff, "Updated")
    }
    case "delete_file": {
      if (!getFileRaw(op.path)) return { status: "error", output: `${op.path}: No such file` }
      deleteFile(op.path)
      return { status: "ok", output: `Deleted ${op.path}` }
    }
    case "rename_file": {
      if (!getFileRaw(op.path)) return { status: "error", output: `${op.path}: No such file` }
      if (getFileRaw(op.newPath)) return { status: "error", output: `${op.newPath}: already exists` }
      renameFile(op.path, op.newPath)
      return { status: "ok", output: `Renamed ${op.path} → ${op.newPath}` }
    }
  }
}

const applyPatchAndStore = (path: string, content: string, diff: string, verb: string): ToolResult<string> => {
  const result = applyFilePatch(path, content, diff)
  if (result.status === "error") return { status: "error", output: result.error }
  updateFileRaw(result.path, result.content)
  return { status: "ok", output: `${verb} ${result.path}` }
}

const operationToAction: Record<Operation["type"], Action> = {
  create_file: "CreateFile",
  update_file: "UpdateFile",
  delete_file: "DeleteFile",
  rename_file: "RenameFile",
}

const toCommand = (op: Operation): Command =>
  op.type === "rename_file"
    ? { action: "RenameFile", path: op.path, newPath: op.newPath }
    : { action: operationToAction[op.type], path: op.path, diff: "diff" in op ? op.diff : undefined }

const persistToServer = (projectId: string, op: Operation): void => {
  sendCommand(projectId, toCommand(op)).catch(() => {})
}
