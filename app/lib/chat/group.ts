import type { Block } from "~/lib/agent"
import { type Derived, type DerivedPlan, type PerSectionConfig, type Step } from "~/lib/agent"
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

export type PlanSection = {
  type: "plan-section"
  file: string
  indexInFile: number
  totalInFile: number
}

export type PlanSectionGroup = {
  type: "plan-section-group"
  section: PlanSection
  children: (PlanStep | LeafMessage)[]
  dimmed: boolean
}

export type PlanChild = PlanStep | PlanSection | PlanSectionGroup | LeafMessage

export type PlanHeader = {
  type: "plan-header"
  task: string
  completed: boolean
  aborted: boolean
}

export type PlanItem = {
  type: "plan-item"
  child: PlanChild
  section: boolean
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

const buildPlanRanges = (history: Block[], plans: DerivedPlan[]): PlanRange[] => {
  const indices = findCreationIndices(history, "create_plan")
  return plans.map((plan, i) => ({
    plan,
    startIndex: indices[i] ?? 0,
    endIndex: indices[i + 1] ?? history.length,
  }))
}

const isPlanCompleted = (plan: DerivedPlan): boolean =>
  plan.currentStep === null && !plan.aborted

const getStepStatus = (step: Step, flatIndex: number, currentStep: number | null, aborted: boolean): StepStatus => {
  if (step.done) return "completed"
  if (aborted && currentStep === flatIndex) return "cancelled"
  if (currentStep === flatIndex) return "active"
  return "pending"
}

const isInPerSectionRange = (flatIndex: number, ps: PerSectionConfig): boolean =>
  flatIndex >= ps.firstInnerStepIndex && flatIndex < ps.firstInnerStepIndex + ps.innerStepCount

const isLastInnerStep = (flatIndex: number, ps: PerSectionConfig): boolean =>
  flatIndex === ps.firstInnerStepIndex + ps.innerStepCount - 1

type StepTransition = { blockIndex: number; newStep: number; newSection: number }

const findStepTransitions = (
  history: Block[],
  planStart: number,
  planEnd: number,
  plan: DerivedPlan
): StepTransition[] => {
  const statuses = collectResultStatuses(history)
  const transitions: StepTransition[] = []
  let currentStep = 0
  let currentSection = 0

  for (let i = planStart; i < planEnd; i++) {
    if (!isSuccessfulCompleteStep(history[i], statuses)) continue

    const ps = plan.perSection
    if (ps && isInPerSectionRange(currentStep, ps)) {
      if (isLastInnerStep(currentStep, ps) && currentSection < ps.sections.length - 1) {
        currentSection++
        currentStep = ps.firstInnerStepIndex
      } else if (isLastInnerStep(currentStep, ps)) {
        currentStep = ps.firstInnerStepIndex + ps.innerStepCount
      } else {
        currentStep++
      }
    } else {
      currentStep++
    }
    transitions.push({ blockIndex: i + 1, newStep: currentStep, newSection: currentSection })
  }

  return transitions
}

type MessagePosition = { flatStep: number; section: number }

const getPositionAtIndex = (blockIndex: number, transitions: StepTransition[]): MessagePosition => {
  let flatStep = 0
  let section = 0
  for (const t of transitions) {
    if (blockIndex < t.blockIndex) break
    flatStep = t.newStep
    section = t.newSection
  }
  return { flatStep, section }
}

const buildInnerSteps = (plan: DerivedPlan): PlanStep[] => {
  if (!plan.perSection) return []
  const { firstInnerStepIndex, innerStepCount } = plan.perSection
  return plan.steps
    .slice(firstInnerStepIndex, firstInnerStepIndex + innerStepCount)
    .map((step, i) => ({
      type: "plan-step" as const,
      description: step.description,
      summary: step.summary,
      status: getStepStatus(step, firstInnerStepIndex + i, plan.currentStep, plan.aborted),
    }))
}

const buildCompletedSectionSteps = (plan: DerivedPlan, sectionIndex: number): PlanStep[] => {
  if (!plan.perSection) return []
  const result = plan.perSection.completedSections.find((s) => s.sectionIndex === sectionIndex)
  if (!result) return []
  const { firstInnerStepIndex } = plan.perSection
  return result.innerResults.map((r, i) => ({
    type: "plan-step" as const,
    description: plan.steps[firstInnerStepIndex + i]?.description ?? "",
    summary: r.summary,
    status: "completed" as const,
  }))
}

const toItem = (child: PlanChild, section: boolean, dimmed: boolean): PlanItem => ({
  type: "plan-item",
  child,
  section,
  dimmed,
})

const buildPlanHeader = (plan: DerivedPlan): PlanHeader => ({
  type: "plan-header",
  task: plan.task,
  completed: isPlanCompleted(plan),
  aborted: plan.aborted,
})

const buildSimplePlanEntries = (
  plan: DerivedPlan,
  leaves: Indexed<LeafMessage>[],
  transitions: StepTransition[],
  startIndex: number,
  endIndex: number
): FlatEntry[] => {
  const totalSteps = plan.steps.length
  const stepActivations = plan.steps.map((step, i) => {
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
        false,
      ),
    }
  })

  const leafEntries: FlatEntry[] = leaves.map((l) => ({
    blockIndex: l.index,
    item: toItem(l.message, false, false),
  }))

  return [...stepActivations, ...leafEntries]
}

const buildPerSectionPlanEntries = (
  plan: DerivedPlan,
  ps: PerSectionConfig,
  leaves: Indexed<LeafMessage>[],
  transitions: StepTransition[],
  planStart: number,
  endIndex: number
): FlatEntry[] => {
  const outerBefore = plan.steps.slice(0, ps.firstInnerStepIndex)
  const outerAfter = plan.steps.slice(ps.firstInnerStepIndex + ps.innerStepCount)
  const afterStartIndex = ps.firstInnerStepIndex + ps.innerStepCount
  const totalAfter = outerAfter.length

  const beforeEntries: FlatEntry[] = outerBefore.map((step, i) => ({
    blockIndex: i === 0 ? planStart : (transitions.find((t) => t.newStep === i)?.blockIndex ?? endIndex - (totalAfter + 1 + outerBefore.length - i) * 0.001),
    item: toItem(
      {
        type: "plan-step" as const,
        description: step.description,
        summary: step.summary,
        status: getStepStatus(step, i, plan.currentStep, plan.aborted),
      },
      false,
      false,
    ),
  }))

  const afterEntries: FlatEntry[] = outerAfter.map((step, i) => {
    const flatIdx = afterStartIndex + i
    return {
      blockIndex: transitions.find((t) => t.newStep === flatIdx)?.blockIndex ?? endIndex - (totalAfter - i) * 0.001,
      item: toItem(
        {
          type: "plan-step" as const,
          description: step.description,
          summary: step.summary,
          status: getStepStatus(step, flatIdx, plan.currentStep, plan.aborted),
        },
        false,
        false,
      ),
    }
  })

  const sectionBoundaries = transitions
    .filter((t) => t.newStep === ps.firstInnerStepIndex && t.newSection > 0)
    .map((t) => ({ blockIndex: t.blockIndex, section: t.newSection }))

  const totalSections = ps.sections.length

  const sectionEntries: FlatEntry[] = []
  for (let s = 0; s < totalSections; s++) {
    const section = ps.sections[s]
    if (!section) continue

    const isCurrentSection = s === ps.currentSection && plan.currentStep !== null &&
      isInPerSectionRange(plan.currentStep, ps)
    const isCompletedSection = ps.completedSections.some((cs) => cs.sectionIndex === s)
    const isDimmed = !isCurrentSection && !isCompletedSection

    const sectionStart = s === 0
      ? (transitions.find((t) => t.newStep === ps.firstInnerStepIndex)?.blockIndex ?? planStart)
      : (sectionBoundaries.find((b) => b.section === s)?.blockIndex ?? endIndex - 0.01)

    const sectionLabel: PlanSection = {
      type: "plan-section" as const,
      file: section.file,
      indexInFile: section.indexInFile,
      totalInFile: section.totalInFile,
    }

    const steps = isCompletedSection && !isCurrentSection
      ? buildCompletedSectionSteps(plan, s)
      : buildInnerSteps(plan)

    const sectionLeaves = leaves.filter((l) => {
      const pos = getPositionAtIndex(l.index, transitions)
      return pos.section === s && isInPerSectionRange(pos.flatStep, ps)
    })

    const children: (PlanStep | LeafMessage)[] = [
      ...steps,
      ...sectionLeaves.map((l) => l.message),
    ]

    sectionEntries.push({
      blockIndex: sectionStart,
      item: toItem(
        { type: "plan-section-group" as const, section: sectionLabel, children, dimmed: isDimmed },
        true,
        isDimmed,
      ),
    })
  }

  const outsideLeaves = leaves.filter((l) => {
    const pos = getPositionAtIndex(l.index, transitions)
    return !isInPerSectionRange(pos.flatStep, ps)
  })
  const outsideEntries: FlatEntry[] = outsideLeaves.map((l) => ({
    blockIndex: l.index,
    item: toItem(l.message, false, false),
  }))

  return [...beforeEntries, ...sectionEntries, ...afterEntries, ...outsideEntries]
}

const buildPlanEntries = (
  range: PlanRange,
  leaves: Indexed<LeafMessage>[],
  history: Block[]
): FlatEntry[] => {
  const { plan, startIndex, endIndex } = range
  const transitions = findStepTransitions(history, startIndex, endIndex, plan)
  const header: FlatEntry = {
    blockIndex: startIndex,
    item: buildPlanHeader(plan),
  }

  const ps = plan.perSection
  const itemEntries = ps
    ? buildPerSectionPlanEntries(plan, ps, leaves, transitions, startIndex, endIndex)
    : buildSimplePlanEntries(plan, leaves, transitions, startIndex, endIndex)

  return [header, ...itemEntries]
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
