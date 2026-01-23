import type { Block, ToolCall } from "~/lib/agent"
import { derive, findCall, hasActivePlan, hasActiveExploration, type DerivedPlan, type DerivedExploration } from "~/lib/agent"

export type TextMessage = {
  type: "text"
  role: "user" | "assistant"
  content: string
}

export type PlanMessage = {
  type: "plan"
  plan: DerivedPlan
  currentStep: number | null
  aborted: boolean
  ask: string | null
}

export type ExplorationMessage = {
  type: "exploration"
  exploration: DerivedExploration
  completed: boolean
  aborted: boolean
  ask: string | null
}

export type AskMessage = {
  type: "ask"
  question: string
}

export type RenderMessage = TextMessage | PlanMessage | ExplorationMessage | AskMessage

type Indexed<T> = { index: number; message: T }

const hasContent = (s: string): boolean => s.trim().length > 0

const isTextBlock = (b: Block): b is { type: "user" | "text"; content: string } =>
  b.type === "user" || b.type === "text"

const getToolCallArg = (call: ToolCall | undefined, key: string): string =>
  (call?.args[key] as string) ?? ""

const findUnansweredAsk = (history: Block[]): string | null => {
  for (let i = history.length - 1; i >= 0; i--) {
    const block = history[i]
    if (block.type === "user") return null
    const askCall = findCall(block, "ask")
    if (askCall) return getToolCallArg(askCall, "question") || null
  }
  return null
}

const textMessagesIndexed = (history: Block[]): Indexed<TextMessage>[] =>
  history
    .map((b, i) => ({ block: b, index: i }))
    .filter((item): item is { block: { type: "user" | "text"; content: string }; index: number } =>
      isTextBlock(item.block) && hasContent(item.block.content)
    )
    .map(({ block, index }) => ({
      index,
      message: {
        type: "text" as const,
        role: block.type === "user" ? "user" : "assistant",
        content: block.content,
      },
    }))

const findCreationIndices = (history: Block[], toolName: string): number[] =>
  history
    .map((b, i) => ({ block: b, index: i }))
    .filter(({ block }) => findCall(block, toolName) !== undefined)
    .map(({ index }) => index)

const planMessagesIndexed = (history: Block[], plans: DerivedPlan[], ask: string | null, hasActiveExpl: boolean): Indexed<PlanMessage>[] => {
  const indices = findCreationIndices(history, "create_plan")
  return plans.map((plan, i) => {
    const isLast = i === plans.length - 1
    const isActive = isLast && plan.currentStep !== null && !plan.aborted
    const showAsk = isActive && !hasActiveExpl ? ask : null
    return {
      index: indices[i] ?? 0,
      message: { type: "plan", plan, currentStep: plan.currentStep, aborted: plan.aborted, ask: showAsk },
    }
  })
}

const explorationMessagesIndexed = (
  history: Block[],
  exploration: DerivedExploration | null,
  ask: string | null
): Indexed<ExplorationMessage>[] => {
  if (!exploration) return []
  const indices = findCreationIndices(history, "start_exploration")
  const index = indices[indices.length - 1] ?? 0
  const isActive = !exploration.completed
  const showAsk = isActive ? ask : null
  const aborted = findCall(history[history.length - 1], "abort") !== undefined && !exploration.completed
  return [{ index, message: { type: "exploration", exploration, completed: exploration.completed, aborted, ask: showAsk } }]
}

const byIndex = <T>(a: Indexed<T>, b: Indexed<T>): number => a.index - b.index

const findAskIndex = (history: Block[]): number => {
  for (let i = history.length - 1; i >= 0; i--) {
    if (findCall(history[i], "ask")) return i
  }
  return history.length - 1
}

const standaloneAskMessage = (history: Block[], ask: string | null, hasActivePln: boolean, hasActiveExpl: boolean): Indexed<AskMessage>[] => {
  if (!ask || hasActivePln || hasActiveExpl) return []
  return [{ index: findAskIndex(history), message: { type: "ask", question: ask } }]
}

export const toRenderMessages = (history: Block[]): RenderMessage[] => {
  const d = derive(history)
  const ask = findUnansweredAsk(history)
  const hasActivePln = hasActivePlan(d)
  const hasActiveExpl = hasActiveExploration(d)
  const indexed: Indexed<RenderMessage>[] = [
    ...textMessagesIndexed(history),
    ...planMessagesIndexed(history, d.plans, ask, hasActiveExpl),
    ...explorationMessagesIndexed(history, d.exploration, ask),
    ...standaloneAskMessage(history, ask, hasActivePln, hasActiveExpl),
  ]
  return indexed.sort(byIndex).map((item) => item.message)
}
