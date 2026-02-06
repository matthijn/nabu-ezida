import type { Block } from "~/lib/agent"
import { type Derived, type DerivedPlan, type PerSectionConfig, type Step } from "~/lib/agent"
import {
  type TextMessage,
  type OrientationMessage,
  type Indexed,
  textMessagesIndexed,
  orientationMessagesIndexed,
  findCreationIndices,
  byIndex,
} from "./messages"

export type LeafMessage = TextMessage | OrientationMessage

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

export type PlanChild = PlanStep | PlanSection | LeafMessage

export type PlanGroup = {
  type: "plan-group"
  task: string
  completed: boolean
  aborted: boolean
  children: PlanChild[]
}

export type GroupedMessage = LeafMessage | PlanGroup

type PlanRange = {
  plan: DerivedPlan
  startIndex: number
  endIndex: number
}

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

const buildOuterSteps = (plan: DerivedPlan): PlanStep[] =>
  plan.steps
    .filter((_, i) => !plan.perSection || !isInPerSectionRange(i, plan.perSection))
    .map((step, _, arr) => {
      const flatIndex = plan.steps.indexOf(step)
      return {
        type: "plan-step" as const,
        description: step.description,
        summary: step.summary,
        status: getStepStatus(step, flatIndex, plan.currentStep, plan.aborted),
      }
    })

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

const buildPlanChildren = (
  plan: DerivedPlan,
  leaves: Indexed<LeafMessage>[],
  transitions: StepTransition[],
  planStart: number
): PlanChild[] => {
  const ps = plan.perSection
  if (!ps) {
    return buildSimplePlanChildren(plan, leaves, transitions)
  }
  return buildPerSectionPlanChildren(plan, ps, leaves, transitions, planStart)
}

const buildSimplePlanChildren = (
  plan: DerivedPlan,
  leaves: Indexed<LeafMessage>[],
  transitions: StepTransition[]
): PlanChild[] => {
  const stepActivations: { blockIndex: number; step: PlanStep }[] = plan.steps.map((step, i) => {
    const activation = i === 0
      ? 0
      : transitions.find((t) => t.newStep === i)?.blockIndex ?? Infinity
    return {
      blockIndex: activation,
      step: {
        type: "plan-step" as const,
        description: step.description,
        summary: step.summary,
        status: getStepStatus(step, i, plan.currentStep, plan.aborted),
      },
    }
  })

  type Entry = { blockIndex: number; child: PlanChild }
  const entries: Entry[] = [
    ...stepActivations.map((s) => ({ blockIndex: s.blockIndex, child: s.step })),
    ...leaves.map((l) => ({ blockIndex: l.index, child: l.message })),
  ]
  return entries.sort((a, b) => a.blockIndex - b.blockIndex).map((e) => e.child)
}

const buildPerSectionPlanChildren = (
  plan: DerivedPlan,
  ps: PerSectionConfig,
  leaves: Indexed<LeafMessage>[],
  transitions: StepTransition[],
  planStart: number
): PlanChild[] => {
  const outerBefore = plan.steps.slice(0, ps.firstInnerStepIndex)
  const outerAfter = plan.steps.slice(ps.firstInnerStepIndex + ps.innerStepCount)
  const afterStartIndex = ps.firstInnerStepIndex + ps.innerStepCount

  const beforeEntries: { blockIndex: number; child: PlanChild }[] = outerBefore.map((step, i) => ({
    blockIndex: i === 0 ? 0 : (transitions.find((t) => t.newStep === i)?.blockIndex ?? Infinity),
    child: {
      type: "plan-step" as const,
      description: step.description,
      summary: step.summary,
      status: getStepStatus(step, i, plan.currentStep, plan.aborted),
    },
  }))

  const afterEntries: { blockIndex: number; child: PlanChild }[] = outerAfter.map((step, i) => {
    const flatIdx = afterStartIndex + i
    return {
      blockIndex: transitions.find((t) => t.newStep === flatIdx)?.blockIndex ?? Infinity,
      child: {
        type: "plan-step" as const,
        description: step.description,
        summary: step.summary,
        status: getStepStatus(step, flatIdx, plan.currentStep, plan.aborted),
      },
    }
  })

  const sectionBoundaries = transitions
    .filter((t) => t.newStep === ps.firstInnerStepIndex && t.newSection > 0)
    .map((t) => ({ blockIndex: t.blockIndex, section: t.newSection }))

  const totalSections = Math.max(
    ps.currentSection + 1,
    ps.completedSections.length + 1
  )

  const sectionEntries: { blockIndex: number; child: PlanChild }[] = []
  for (let s = 0; s < totalSections; s++) {
    const section = ps.sections[s]
    if (!section) continue

    const isCurrentSection = s === ps.currentSection && plan.currentStep !== null &&
      isInPerSectionRange(plan.currentStep, ps)
    const isCompletedSection = ps.completedSections.some((cs) => cs.sectionIndex === s)

    const sectionStart = s === 0
      ? (transitions.find((t) => t.newStep === ps.firstInnerStepIndex)?.blockIndex ?? planStart)
      : (sectionBoundaries.find((b) => b.section === s)?.blockIndex ?? Infinity)

    sectionEntries.push({
      blockIndex: sectionStart,
      child: {
        type: "plan-section" as const,
        file: section.file,
        indexInFile: section.indexInFile,
        totalInFile: section.totalInFile,
      },
    })

    const steps = isCompletedSection && !isCurrentSection
      ? buildCompletedSectionSteps(plan, s)
      : buildInnerSteps(plan)

    steps.forEach((step, i) => {
      sectionEntries.push({ blockIndex: sectionStart + i * 0.001, child: step })
    })

    const sectionEnd = sectionBoundaries.find((b) => b.section === s + 1)?.blockIndex ?? Infinity
    const sectionLeaves = leaves.filter((l) => {
      const pos = getPositionAtIndex(l.index, transitions)
      return pos.section === s && isInPerSectionRange(pos.flatStep, ps)
    })
    sectionLeaves.forEach((l) => {
      sectionEntries.push({ blockIndex: l.index, child: l.message })
    })
  }

  const outsideLeaves = leaves.filter((l) => {
    const pos = getPositionAtIndex(l.index, transitions)
    return !isInPerSectionRange(pos.flatStep, ps)
  })
  const outsideEntries = outsideLeaves.map((l) => ({
    blockIndex: l.index,
    child: l.message,
  }))

  return [...beforeEntries, ...sectionEntries, ...afterEntries, ...outsideEntries]
    .sort((a, b) => a.blockIndex - b.blockIndex)
    .map((e) => e.child)
}

const toPlanGroup = (
  range: PlanRange,
  leaves: Indexed<LeafMessage>[],
  history: Block[]
): PlanGroup => {
  const transitions = findStepTransitions(history, range.startIndex, range.endIndex, range.plan)
  return {
    type: "plan-group",
    task: range.plan.task,
    completed: isPlanCompleted(range.plan),
    aborted: range.plan.aborted,
    children: buildPlanChildren(range.plan, leaves, transitions, range.startIndex),
  }
}

const isInRange = (index: number, range: PlanRange): boolean =>
  index >= range.startIndex && index < range.endIndex

export const toGroupedMessages = (history: Block[], derived: Derived): GroupedMessage[] => {
  const planRanges = buildPlanRanges(history, derived.plans)

  const textLeaves: Indexed<LeafMessage>[] = textMessagesIndexed(history)
  const orientLeaves: Indexed<LeafMessage>[] = orientationMessagesIndexed(history, derived.orientation)
  const allLeaves = [...textLeaves, ...orientLeaves].sort(byIndex)

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

  const planEntries: OrderedEntry[] = planRanges.map((range, i) => ({
    blockIndex: range.startIndex,
    item: toPlanGroup(range, planLeaves.get(i) ?? [], history),
  }))

  return [...outsideEntries, ...planEntries]
    .sort((a, b) => a.blockIndex - b.blockIndex)
    .map((e) => e.item)
}
