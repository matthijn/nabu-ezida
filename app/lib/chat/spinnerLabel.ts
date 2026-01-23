import type { Block } from "~/lib/agent"

const toolLabels: Record<string, string> = {
  start_exploration: "Exploring",
  exploration_step: "Investigating",
  create_plan: "Planning",
  complete_step: "Thinking",
  abort: "Stopping",
  execute_sql: "Reading",
  upsert_annotations: "Annotating",
  delete_annotations: "Removing annotations",
  apply_patch: "Writing",
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

export const getSpinnerLabel = (history: Block[], streamingToolName?: string | null): string => {
  if (streamingToolName) return toLabel(streamingToolName)
  return toLabel(findLastToolCallName(history))
}