import type { Block } from "~/lib/agent"
import { sampleAndHold } from "~/lib/utils"

const toolLabels: Record<string, string> = {
  run_local_shell: "Reading",
  patch_json_block: "Writing",
  apply_local_patch: "Writing",
  copy_file: "Writing",
  rename_file: "Writing",
  remove_file: "Writing",
  plan: "Planning",
  submit_plan: "Starting execution",
  for_each: "Processing",
  complete_step: "Working",
  cancel: "Cancelling",
  ask: "Asking",
  compacted: "Summarizing conversation",
}

const toLabel = (toolName: string | null): string => {
  if (!toolName) return "Thinking"
  return toolLabels[toolName] ?? "Thinking"
}

const findTurnStart = (history: Block[]): number => {
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].type === "user") return i + 1
  }
  return 0
}

const findLastBoldBlock = (text: string): string | null => {
  const matches = [...text.matchAll(/\*\*(.+?)\*\*/g)]
  return matches.length > 0 ? matches[matches.length - 1][1].trim() : null
}

const extractReasoningLabel = (text: string): string | null =>
  findLastBoldBlock(text.trim())

const findLastReasoningContent = (history: Block[], from: number): string | null => {
  for (let i = history.length - 1; i >= from; i--) {
    const block = history[i]
    if (block.type === "reasoning") return block.content
  }
  return null
}

const getDraftToolName = (draft: Block | null): string | null => {
  if (!draft || draft.type !== "tool_call") return null
  return draft.calls[0]?.name ?? null
}

const findLastToolCallName = (history: Block[], from: number): string | null => {
  for (let i = history.length - 1; i >= from; i--) {
    const block = history[i]
    if (block.type === "tool_call" && block.calls.length > 0) {
      return block.calls[block.calls.length - 1].name
    }
  }
  return null
}

const HOLD_MS = 400

const computeSpinnerLabel = (history: Block[], draft: Block | null): string => {
  const turnStart = findTurnStart(history)

  if (draft?.type === "reasoning") return extractReasoningLabel(draft.content) ?? "Thinking"

  const reasoning = findLastReasoningContent(history, turnStart)
  if (reasoning) return extractReasoningLabel(reasoning) ?? "Thinking"

  const draftTool = getDraftToolName(draft)
  if (draftTool) return toLabel(draftTool)

  return toLabel(findLastToolCallName(history, turnStart))
}

export const getSpinnerLabel = sampleAndHold(computeSpinnerLabel, HOLD_MS)
