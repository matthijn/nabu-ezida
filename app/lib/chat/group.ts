import type { Block } from "~/lib/agent"
import { type Derived, type DerivedPlan } from "~/lib/agent"
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

export type SectionGroup = {
  type: "section-group"
  file: string
  indexInFile: number
  totalInFile: number
  messages: LeafMessage[]
}

export type PlanGroup = {
  type: "plan-group"
  task: string
  completed: boolean
  aborted: boolean
  children: (LeafMessage | SectionGroup)[]
}

export type GroupedMessage = LeafMessage | PlanGroup

type PlanRange = {
  plan: DerivedPlan
  startIndex: number
  endIndex: number
  sectionBoundaries: number[]
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

const findSectionBoundaries = (
  history: Block[],
  planStartIndex: number,
  planEndIndex: number,
  firstInnerStepIndex: number,
  innerStepCount: number,
  totalSections: number
): number[] => {
  const statuses = collectResultStatuses(history)
  const boundaries: number[] = []
  let completedSteps = 0

  for (let i = planStartIndex; i < planEndIndex; i++) {
    if (!isSuccessfulCompleteStep(history[i], statuses)) continue
    completedSteps++
    const nextSectionIdx = boundaries.length + 1
    const threshold = firstInnerStepIndex + nextSectionIdx * innerStepCount
    if (completedSteps === threshold && nextSectionIdx < totalSections) {
      boundaries.push(i + 1)
    }
  }

  return boundaries
}

const buildPlanRanges = (history: Block[], plans: DerivedPlan[]): PlanRange[] => {
  const indices = findCreationIndices(history, "create_plan")
  return plans.map((plan, i) => {
    const startIndex = indices[i] ?? 0
    const endIndex = indices[i + 1] ?? history.length

    const sectionBoundaries = plan.perSection
      ? findSectionBoundaries(
          history, startIndex, endIndex,
          plan.perSection.firstInnerStepIndex,
          plan.perSection.innerStepCount,
          plan.perSection.sections.length
        )
      : []

    return { plan, startIndex, endIndex, sectionBoundaries }
  })
}

const isPlanCompleted = (plan: DerivedPlan): boolean =>
  plan.currentStep === null && !plan.aborted

const findSectionIndex = (boundaries: number[], blockIndex: number): number => {
  for (let i = boundaries.length - 1; i >= 0; i--) {
    if (blockIndex >= boundaries[i]) return i + 1
  }
  return 0
}

const toPlanChildren = (
  leaves: Indexed<LeafMessage>[],
  range: PlanRange
): (LeafMessage | SectionGroup)[] => {
  if (range.sectionBoundaries.length === 0) return leaves.map((l) => l.message)

  const buckets: Map<number, LeafMessage[]> = new Map()
  for (const { index, message } of leaves) {
    const sIdx = findSectionIndex(range.sectionBoundaries, index)
    const bucket = buckets.get(sIdx) ?? []
    bucket.push(message)
    buckets.set(sIdx, bucket)
  }

  const sortedKeys = [...buckets.keys()].sort((a, b) => a - b)
  return sortedKeys.map((sIdx) => {
    const section = range.plan.perSection!.sections[sIdx]
    return section
      ? {
          type: "section-group" as const,
          file: section.file,
          indexInFile: section.indexInFile,
          totalInFile: section.totalInFile,
          messages: buckets.get(sIdx)!,
        }
      : {
          type: "section-group" as const,
          file: "",
          indexInFile: 0,
          totalInFile: 0,
          messages: buckets.get(sIdx)!,
        }
  })
}

const toPlanGroup = (range: PlanRange, leaves: Indexed<LeafMessage>[]): PlanGroup => ({
  type: "plan-group",
  task: range.plan.task,
  completed: isPlanCompleted(range.plan),
  aborted: range.plan.aborted,
  children: toPlanChildren(leaves, range),
})

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
    item: toPlanGroup(range, planLeaves.get(i) ?? []),
  }))

  return [...outsideEntries, ...planEntries]
    .sort((a, b) => a.blockIndex - b.blockIndex)
    .map((e) => e.item)
}
