import type { Block } from "~/lib/agent"
import type { TaggedBlock } from "~/lib/agent/block-store"

const toolLabels: Record<string, string> = {
  run_local_shell: "Reading",
  apply_local_patch: "Writing",
  execute_with_plan: "Planning",
  create_plan: "Starting execution",
  for_each: "Processing",
  cancel: "Cancelling",
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

const extractLastSentenceFragment = (text: string): string | null => {
  const lines = text.trim().split("\n")
  const last = lines[lines.length - 1].trim()
  if (!last) return null
  const match = last.match(/^[^.!?]+/)
  return match?.[0].trim() || null
}

const extractReasoningLabel = (text: string): string | null => {
  const trimmed = text.trim()
  if (!trimmed) return null
  return findLastBoldBlock(trimmed) ?? extractLastSentenceFragment(trimmed)
}

const findLastReasoningContent = (history: Block[], from: number): string | null => {
  for (let i = history.length - 1; i >= from; i--) {
    const block = history[i]
    if (block.type === "reasoning") return block.content
  }
  return null
}

const getDraftToolName = (draft: TaggedBlock | null): string | null => {
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

export const getSpinnerLabel = (history: Block[], draft: TaggedBlock | null): string => {
  const turnStart = findTurnStart(history)

  if (draft?.type === "reasoning") return extractReasoningLabel(draft.content) ?? "Thinking"

  const reasoning = findLastReasoningContent(history, turnStart)
  if (reasoning) return extractReasoningLabel(reasoning) ?? "Thinking"

  const draftTool = getDraftToolName(draft)
  if (draftTool) return toLabel(draftTool)

  return toLabel(findLastToolCallName(history, turnStart))
}
