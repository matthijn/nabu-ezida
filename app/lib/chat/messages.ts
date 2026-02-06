import type { Block, Files } from "~/lib/agent"
import { derive, findCall, type DerivedPlan, type DerivedOrientation } from "~/lib/agent"

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
}

export type OrientationMessage = {
  type: "orientation"
  orientation: DerivedOrientation
  completed: boolean
  aborted: boolean
}

export type RenderMessage = TextMessage | PlanMessage | OrientationMessage

type Indexed<T> = { index: number; message: T }

const hasContent = (s: string): boolean => s.trim().length > 0

const isTextBlock = (b: Block): b is { type: "user" | "text"; content: string } =>
  b.type === "user" || b.type === "text"

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

const planMessagesIndexed = (history: Block[], plans: DerivedPlan[]): Indexed<PlanMessage>[] => {
  const indices = findCreationIndices(history, "create_plan")
  return plans.map((plan, i) => ({
    index: indices[i] ?? 0,
    message: { type: "plan", plan, currentStep: plan.currentStep, aborted: plan.aborted },
  }))
}

const orientationMessagesIndexed = (
  history: Block[],
  orientation: DerivedOrientation | null
): Indexed<OrientationMessage>[] => {
  if (!orientation) return []
  const indices = findCreationIndices(history, "orientate")
  const index = indices[indices.length - 1] ?? 0
  const aborted = findCall(history[history.length - 1], "abort") !== undefined && !orientation.completed
  return [{ index, message: { type: "orientation", orientation, completed: orientation.completed, aborted } }]
}

const byIndex = <T>(a: Indexed<T>, b: Indexed<T>): number => a.index - b.index

export const toRenderMessages = (history: Block[], files: Files = {}): RenderMessage[] => {
  const d = derive(history, files)
  const indexed: Indexed<RenderMessage>[] = [
    ...textMessagesIndexed(history),
    ...planMessagesIndexed(history, d.plans),
    ...orientationMessagesIndexed(history, d.orientation),
  ]
  return indexed.sort(byIndex).map((item) => item.message)
}
