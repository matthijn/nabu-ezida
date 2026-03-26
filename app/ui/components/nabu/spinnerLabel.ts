import type { Block } from "~/lib/agent/client"

const toolLabels: Record<string, string> = {
  run_local_shell: "Reading",
  patch_json_block: "Writing",
  apply_local_patch: "Writing",
  copy_file: "Writing",
  rename_file: "Writing",
  remove_file: "Writing",
  preflight: "Preparing",
  get_guidance: "Reading instructions manual",
  submit_plan: "Starting execution",
  complete_step: "Working",
  cancel: "Cancelling",
  search: "Looking around",
  query: "Examining data",
  ask: "Asking",
  compacted: "Summarizing conversation",
}

const DEFAULT_LABEL = "Thinking"

const toLabel = (toolName: string | null): string =>
  toolName ? (toolLabels[toolName] ?? DEFAULT_LABEL) : DEFAULT_LABEL

const findLastBoldText = (text: string): string | null => {
  const matches = [...text.matchAll(/\*\*(.+?)\*\*/g)]
  return matches.length > 0 ? matches[matches.length - 1][1].trim() : null
}

const blockToSpinnerLabel = (block: Block): string | null => {
  if (block.type === "reasoning") return findLastBoldText(block.content) ?? DEFAULT_LABEL
  if (block.type === "tool_call" && block.calls.length > 0)
    return toLabel(block.calls[block.calls.length - 1].name)
  if (block.type === "tool_result") return toLabel(block.toolName ?? null)
  return null
}

const findTurnStart = (history: Block[]): number => {
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].type === "user") return i + 1
  }
  return 0
}

export const getSpinnerLabel = (history: Block[], draft: Block | null): string => {
  if (draft) {
    const label = blockToSpinnerLabel(draft)
    if (label) return label
  }
  const turnStart = findTurnStart(history)
  for (let i = history.length - 1; i >= turnStart; i--) {
    const label = blockToSpinnerLabel(history[i])
    if (label) return label
  }
  return DEFAULT_LABEL
}
