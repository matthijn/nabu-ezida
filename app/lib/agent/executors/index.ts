import type { ToolCall, ToolDeps, Handler, ToolResult } from "../types"
import { applyPatchTool as applyLocalPatch } from "./patch"
import { createPlan, completeStep, abort, startExploration, explorationStep } from "./orchestration"
import { shellTool as runLocalShell } from "./shell"

export type { ToolDeps }

const handlers: Record<string, Handler> = {
  apply_local_patch: applyLocalPatch,
  create_plan: createPlan,
  complete_step: completeStep,
  abort,
  start_exploration: startExploration,
  exploration_step: explorationStep,
  run_local_shell: runLocalShell,
}

export const createToolExecutor = (deps: ToolDeps) => async (call: ToolCall): Promise<ToolResult<unknown>> => {
  const handler = handlers[call.name]
  if (handler) return handler(deps, call.args)
  return { status: "error", output: `Unknown tool: ${call.name}` }
}
