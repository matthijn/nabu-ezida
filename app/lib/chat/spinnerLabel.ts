import type { Block } from "~/lib/agent"
import type { TaggedBlock } from "~/lib/agent/block-store"

const toolLabels: Record<string, string> = {
  run_local_shell: "Reading",
  apply_local_patch: "Writing",
  execute_with_plan: "Planning",
  create_plan: "Starting execution",
  for_each: "Processing",
  resolve: "Completing",
  cancel: "Cancelling",
}

const findLastToolCallName = (history: Block[]): string | null => {
  for (let i = history.length - 1; i >= 0; i--) {
    const block = history[i]
    if (block.type === "tool_call" && block.calls.length > 0) {
      return block.calls[block.calls.length - 1].name
    }
  }
  return null
}

const toLabel = (toolName: string | null): string => {
  if (!toolName) return "Thinking"
  return toolLabels[toolName] ?? "Thinking"
}

const getDraftToolName = (draft: TaggedBlock | null): string | null => {
  if (!draft || draft.type !== "tool_call") return null
  return draft.calls[0]?.name ?? null
}

export const getSpinnerLabel = (history: Block[], draft: TaggedBlock | null): string => {
  const draftTool = getDraftToolName(draft)
  if (draftTool) return toLabel(draftTool)
  return toLabel(findLastToolCallName(history))
}
