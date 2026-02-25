import type { Block } from "./types"
import type { Files } from "./derived/plan"
import { derive, lastPlan, hasActivePlan } from "./derived"
import { formatStepProgress } from "./steering/nudges/step-state"

const isCompactedResult = (block: Block): boolean =>
  block.type === "tool_result" && block.toolName === "compacted"

const findLastCompactedResultIndex = (blocks: Block[]): number => {
  for (let i = blocks.length - 1; i >= 0; i--) {
    if (isCompactedResult(blocks[i])) return i
  }
  return -1
}

const findMatchingToolCallIndex = (blocks: Block[], resultIndex: number): number => {
  for (let i = resultIndex - 1; i >= 0; i--) {
    const block = blocks[i]
    if (block.type === "tool_call" && block.calls.some((c) => c.name === "compacted")) return i
  }
  return -1
}

const isPendingBlock = (block: Block): boolean =>
  block.type === "user" || block.type === "tool_result"

const findPendingBlock = (blocks: Block[], toolCallIndex: number): Block | null => {
  for (let i = toolCallIndex - 1; i >= 0; i--) {
    if (isPendingBlock(blocks[i])) return blocks[i]
  }
  return null
}

const extractCompactedState = (blocks: Block[], resultIndex: number, toolCallIndex: number) => {
  const toolCall = toolCallIndex >= 0 ? blocks[toolCallIndex] : null
  if (!toolCall || toolCall.type !== "tool_call") return { summary: "", directives: {} as Record<string, string> }
  const call = toolCall.calls.find((c) => c.name === "compacted")
  return {
    summary: (call?.args?.summary as string) ?? "",
    directives: (call?.args?.directives as Record<string, string>) ?? {},
  }
}

const directivesToBlocks = (directives: Record<string, string>): Block[] =>
  Object.entries(directives).map(
    ([key, value]) => ({ type: "system" as const, content: `<!-- ${key}: ${value} -->` }),
  )

const formatPlanContext = (blocks: Block[], files: Files): string => {
  const d = derive(blocks, files)
  if (!hasActivePlan(d.plans)) return ""
  const plan = lastPlan(d.plans)
  if (!plan) return ""
  return `\n\nActive plan: ${plan.task}\n${formatStepProgress(plan)}`
}

export const compactHistory = (blocks: Block[], files: Files): Block[] => {
  const resultIndex = findLastCompactedResultIndex(blocks)
  if (resultIndex === -1) return blocks

  const toolCallIndex = findMatchingToolCallIndex(blocks, resultIndex)
  const { summary, directives } = extractCompactedState(blocks, resultIndex, toolCallIndex)
  const planContext = formatPlanContext(blocks, files)
  const systemContent = summary + planContext
  const pending = toolCallIndex >= 0 ? findPendingBlock(blocks, toolCallIndex) : null

  return [
    { type: "system" as const, content: systemContent },
    ...directivesToBlocks(directives),
    ...(pending ? [pending] : []),
    ...blocks.slice(resultIndex + 1),
  ]
}
