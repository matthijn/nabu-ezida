import type { Block } from "~/lib/agent"
import { type Derived, type DerivedPlan, type Step } from "~/lib/agent"
import {
  type TextMessage,
  type AskMessage,
  type Indexed,
  textMessagesIndexed,
  extractAskMessages,
  findCreationIndices,
  byIndex,
} from "./messages"

export type LeafMessage = TextMessage

export type StepStatus = "completed" | "active" | "pending" | "cancelled"

export type PlanStep = {
  type: "plan-step"
  description: string
  summary: string | null
  status: StepStatus
}

export type PlanChild = PlanStep | LeafMessage

export type PlanHeader = {
  type: "plan-header"
  task: string
  completed: boolean
  aborted: boolean
}

export type PlanItem = {
  type: "plan-item"
  child: PlanChild
  dimmed: boolean
}

export type GroupedMessage = LeafMessage | AskMessage | PlanHeader | PlanItem

type PlanRange = {
  plan: DerivedPlan
  startIndex: number
  endIndex: number
}

type FlatEntry = { blockIndex: number; item: PlanHeader | PlanItem }

const collectResultStatuses = (history: Block[]): Map<string, string> => {
  const statuses = new Map<string, string>()
  for (const block of history) {
    if (block.type === "tool_result") {
      const status = (block.result as { status?: string })?.status ?? "ok"
      statuses.set(block.callId, status)
    }
  }
  return statuses
}

const isSuccessfulCompleteStep = (block: Block, statuses: Map<string, string>): boolean => {
  if (block.type !== "tool_call") return false
  return block.calls.some((call) =>
    call.name === "complete_step" && statuses.get(call.id) === "ok"
  )
}

const isTerminatingResult = (block: Block, plan: DerivedPlan): boolean => {
  if (block.type !== "tool_result") return false
  if (plan.aborted) return block.toolName === "cancel"
  if (isPlanCompleted(plan)) return block.toolName === "complete_step"
  return false
}

const findTerminationIndex = (history: Block[], plan: DerivedPlan, start: number, bound: number): number => {
  if (!plan.aborted && !isPlanCompleted(plan)) return bound
  for (let i = bound - 1; i >= start; i--) {
    if (isTerminatingResult(history[i], plan)) return i + 1
  }
  return bound
}

const buildPlanRanges = (history: Block[], plans: DerivedPlan[]): PlanRange[] => {
  const indices = findCreationIndices(history, "submit_plan")
  return plans.map((plan, i) => {
    const startIndex = indices[i] ?? 0
    const rawEnd = indices[i + 1] ?? history.length
    return { plan, startIndex, endIndex: findTerminationIndex(history, plan, startIndex, rawEnd) }
  })
}

const isPlanCompleted = (plan: DerivedPlan): boolean =>
  plan.currentStep === null && !plan.aborted

const getStepStatus = (step: Step, flatIndex: number, currentStep: number | null, aborted: boolean): StepStatus => {
  if (step.done) return "completed"
  if (aborted && currentStep === flatIndex) return "cancelled"
  if (currentStep === flatIndex) return "active"
  return "pending"
}

type StepTransition = { blockIndex: number; newStep: number }

const findStepTransitions = (
  history: Block[],
  planStart: number,
  planEnd: number,
): StepTransition[] => {
  const statuses = collectResultStatuses(history)
  const transitions: StepTransition[] = []
  let currentStep = 0

  for (let i = planStart; i < planEnd; i++) {
    if (!isSuccessfulCompleteStep(history[i], statuses)) continue
    currentStep++
    transitions.push({ blockIndex: i + 1, newStep: currentStep })
  }

  return transitions
}

const getStepAtIndex = (blockIndex: number, transitions: StepTransition[]): number => {
  let step = 0
  for (const t of transitions) {
    if (blockIndex < t.blockIndex) break
    step = t.newStep
  }
  return step
}

const toItem = (child: PlanChild, dimmed: boolean): PlanItem => ({
  type: "plan-item",
  child,
  dimmed,
})

const buildPlanHeader = (plan: DerivedPlan): PlanHeader => ({
  type: "plan-header",
  task: plan.task,
  completed: isPlanCompleted(plan),
  aborted: plan.aborted,
})

const buildPlanEntries = (
  range: PlanRange,
  leaves: Indexed<LeafMessage>[],
  history: Block[]
): FlatEntry[] => {
  const { plan, startIndex, endIndex } = range
  const transitions = findStepTransitions(history, startIndex, endIndex)
  const totalSteps = plan.steps.length

  const header: FlatEntry = {
    blockIndex: startIndex,
    item: buildPlanHeader(plan),
  }

  const stepActivations: FlatEntry[] = plan.steps.map((step, i) => {
    const activation = i === 0
      ? startIndex
      : transitions.find((t) => t.newStep === i)?.blockIndex ?? endIndex - (totalSteps - i) * 0.001
    return {
      blockIndex: activation,
      item: toItem(
        {
          type: "plan-step" as const,
          description: step.description,
          summary: step.summary,
          status: getStepStatus(step, i, plan.currentStep, plan.aborted),
        },
        false,
      ),
    }
  })

  const leafEntries: FlatEntry[] = leaves.map((l) => ({
    blockIndex: l.index,
    item: toItem(l.message, false),
  }))

  return [header, ...stepActivations, ...leafEntries]
}

const isInRange = (index: number, range: PlanRange): boolean =>
  index >= range.startIndex && index < range.endIndex

const isConsumedLeaf = (leaf: Indexed<LeafMessage>, consumed: Set<number>): boolean =>
  leaf.message.role === "user" && consumed.has(leaf.index)

export const toGroupedMessages = (
  history: Block[],
  derived: Derived,
): GroupedMessage[] => {
  const planRanges = buildPlanRanges(history, derived.plans)
  const { messages: askMessages, consumedUserIndices } = extractAskMessages(history)

  const allLeaves: Indexed<LeafMessage>[] = textMessagesIndexed(history)
    .filter((l) => !isConsumedLeaf(l, consumedUserIndices))
    .sort(byIndex)

  const planLeaves: Map<number, Indexed<LeafMessage>[]> = new Map()
  const outsideLeaves: Indexed<LeafMessage>[] = []

  for (const leaf of allLeaves) {
    const rangeIdx = planRanges.findIndex((r) => isInRange(leaf.index, r))
    if (rangeIdx === -1) {
      outsideLeaves.push(leaf)
    } else {
      const existing = planLeaves.get(rangeIdx) ?? []
      existing.push(leaf)
      planLeaves.set(rangeIdx, existing)
    }
  }

  type OrderedEntry = { blockIndex: number; item: GroupedMessage }

  const outsideEntries: OrderedEntry[] = outsideLeaves.map((l) => ({
    blockIndex: l.index,
    item: l.message,
  }))

  const askEntries: OrderedEntry[] = askMessages.map((a) => ({
    blockIndex: a.index,
    item: a.message,
  }))

  const planEntries: OrderedEntry[] = planRanges.flatMap((range, i) =>
    buildPlanEntries(range, planLeaves.get(i) ?? [], history)
  )

  return [...outsideEntries, ...askEntries, ...planEntries]
    .sort((a, b) => a.blockIndex - b.blockIndex)
    .map((e) => e.item)
}
