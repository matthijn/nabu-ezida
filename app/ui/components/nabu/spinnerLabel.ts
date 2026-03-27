import type { Block } from "~/lib/agent/client"

export const LABEL_ADVANCE_MS = 3000

const WRITING_LABELS = ["Writing", "Editing", "Applying changes"]

const toolLabels: Record<string, string[]> = {
  run_local_shell: ["Reading", "Examining files", "Processing"],
  patch_json_block: WRITING_LABELS,
  apply_local_patch: WRITING_LABELS,
  copy_file: WRITING_LABELS,
  rename_file: WRITING_LABELS,
  remove_file: ["Removing", "Cleaning up"],
  preflight: ["Preparing", "Setting up"],
  get_guidance: ["Reading instructions manual", "Studying guidance"],
  submit_plan: ["Starting execution", "Planning"],
  complete_step: ["Working", "Making progress", "Finishing up"],
  cancel: ["Cancelling"],
  search: ["Looking around", "Searching documents", "Analyzing results"],
  query: ["Examining data", "Querying", "Processing results"],
  ask: ["Asking"],
  compacted: ["Summarizing conversation", "Compressing context"],
}

const DEFAULT_LABELS: string[] = ["Thinking"]

const toLabels = (toolName: string | null): string[] => {
  if (!toolName) return DEFAULT_LABELS
  return toolLabels[toolName] ?? DEFAULT_LABELS
}

const findLastBoldText = (text: string): string | null => {
  const matches = [...text.matchAll(/\*\*(.+?)\*\*/g)]
  return matches.length > 0 ? matches[matches.length - 1][1].trim() : null
}

const blockToSpinnerLabels = (block: Block): string[] | null => {
  if (block.type === "reasoning") {
    const bold = findLastBoldText(block.content)
    return [bold ?? "Thinking"]
  }
  if (block.type === "tool_call" && block.calls.length > 0)
    return toLabels(block.calls[block.calls.length - 1].name)
  if (block.type === "tool_result") return toLabels(block.toolName ?? null)
  return null
}

const findTurnStart = (history: Block[]): number => {
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].type === "user") return i + 1
  }
  return 0
}

export const getSpinnerLabels = (history: Block[], draft: Block | null): string[] => {
  if (draft) {
    const labels = blockToSpinnerLabels(draft)
    if (labels) return labels
  }
  const turnStart = findTurnStart(history)
  for (let i = history.length - 1; i >= turnStart; i--) {
    const labels = blockToSpinnerLabels(history[i])
    if (labels) return labels
  }
  return DEFAULT_LABELS
}
