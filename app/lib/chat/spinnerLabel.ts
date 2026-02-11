import type { Block } from "~/lib/agent"

const toolLabels: Record<string, string> = {
  orientate: "Orienting",
  reorient: "Focusing",
  create_plan: "Planning",
  complete_step: "Thinking",
  abort: "Stopping",
  run_local_shell: "Reading",
  apply_local_patch: "Writing",
  ask_expert: "Consulting",
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