import type { Block, ToolCall } from "./types"
import { splitByLines } from "~/lib/text"

// Input type from create_plan args
export type StepDefObject = { title: string; expected: string }
export type StepDefPerSection = { per_section: StepDefObject[] }
export type StepDef = StepDefObject | StepDefPerSection

// Flattened step with tracking
export type Step = {
  id: string  // "1", "2.1", "2.2", "3" etc.
  description: string
  expected: string
  done: boolean
  internal: string | null
  summary: string | null
}

export type Finding = {
  id: string
  direction: string
  internal: string | null
  learned: string
}

export type Section = {
  file: string
  indexInFile: number  // 1-based
  totalInFile: number
  content: string
}

export type SectionResult = {
  sectionIndex: number
  file: string
  indexInFile: number
  innerResults: { stepId: string; internal: string | null; summary: string | null }[]
}

export type PerSectionConfig = {
  topStepIndex: number  // which top-level step (0-based) is the per_section
  innerStepCount: number
  firstInnerStepIndex: number  // index in flattened steps array
  sections: Section[]
  currentSection: number  // 0-based
  completedSections: SectionResult[]
}

export type DerivedPlan = {
  task: string
  files: string[] | null
  steps: Step[]
  currentStep: number | null
  perSection: PerSectionConfig | null
  aborted: boolean
}

export type DerivedExploration = {
  question: string
  findings: Finding[]
  currentDirection: string | null
  completed: boolean
}

export type Derived = {
  plans: DerivedPlan[]
  exploration: DerivedExploration | null
}

export type Files = Record<string, { raw: string }>

export const isToolCallBlock = (block: Block): block is { type: "tool_call"; calls: ToolCall[] } =>
  block.type === "tool_call"

export const findCall = (block: Block, name: string): ToolCall | undefined =>
  isToolCallBlock(block) ? block.calls.find((c) => c.name === name) : undefined

export const hasCall = (block: Block, name: string): boolean => findCall(block, name) !== undefined

const isCreatePlan = (call: ToolCall): boolean => call.name === "create_plan"
const isCompleteStep = (call: ToolCall): boolean => call.name === "complete_step"
const isAbort = (call: ToolCall): boolean => call.name === "abort"
const isStartExploration = (call: ToolCall): boolean => call.name === "start_exploration"
const isExplorationStep = (call: ToolCall): boolean => call.name === "exploration_step"

const findCurrentStep = (steps: Step[]): number | null => {
  const index = steps.findIndex((s) => !s.done)
  return index === -1 ? null : index
}

const markStepDone = (steps: Step[], index: number, internal: string | null, summary: string): Step[] =>
  steps.map((s, i) => (i === index ? { ...s, done: true, internal, summary } : s))

const isPerSection = (step: StepDef): step is StepDefPerSection =>
  "per_section" in step

const SECTION_TARGET_LINES = 100

const computeSections = (fileNames: string[], files: Files): Section[] => {
  const sections: Section[] = []
  for (const file of fileNames) {
    const content = files[file]?.raw ?? ""
    const parts = splitByLines(content, SECTION_TARGET_LINES, { stripAttributes: true })
    parts.forEach((part, i) => {
      sections.push({
        file,
        indexInFile: i + 1,
        totalInFile: parts.length,
        content: part,
      })
    })
  }
  return sections
}

const flattenSteps = (stepDefs: StepDef[]): { steps: Step[]; perSectionInfo: { topIndex: number; innerCount: number; firstInnerIndex: number } | null } => {
  const steps: Step[] = []
  let perSectionInfo: { topIndex: number; innerCount: number; firstInnerIndex: number } | null = null
  let topIndex = 0

  for (const def of stepDefs) {
    if (isPerSection(def)) {
      const firstInnerIndex = steps.length
      def.per_section.forEach((innerDef, i) => {
        steps.push({
          id: `${topIndex + 1}.${i + 1}`,
          description: innerDef.title,
          expected: innerDef.expected,
          done: false,
          internal: null,
          summary: null,
        })
      })
      perSectionInfo = { topIndex, innerCount: def.per_section.length, firstInnerIndex }
    } else {
      steps.push({
        id: String(topIndex + 1),
        description: def.title,
        expected: def.expected,
        done: false,
        internal: null,
        summary: null,
      })
    }
    topIndex++
  }

  return { steps, perSectionInfo }
}

const createPlanFromCall = (call: ToolCall, files: Files): DerivedPlan => {
  const stepDefs = call.args.steps as StepDef[]
  const fileNames = (call.args.files as string[] | undefined) ?? null
  const { steps, perSectionInfo } = flattenSteps(stepDefs)

  let perSection: PerSectionConfig | null = null
  if (fileNames && perSectionInfo) {
    const sections = computeSections(fileNames, files)
    perSection = {
      topStepIndex: perSectionInfo.topIndex,
      innerStepCount: perSectionInfo.innerCount,
      firstInnerStepIndex: perSectionInfo.firstInnerIndex,
      sections,
      currentSection: 0,
      completedSections: [],
    }
  }

  return {
    task: call.args.task as string,
    files: fileNames,
    steps,
    currentStep: 0,
    perSection,
    aborted: false,
  }
}

const createExplorationFromCall = (call: ToolCall): DerivedExploration => ({
  question: call.args.question as string,
  findings: [],
  currentDirection: (call.args.direction as string) || null,
  completed: false,
})

const addFinding = (exploration: DerivedExploration, direction: string, internal: string | null, learned: string): DerivedExploration => ({
  ...exploration,
  findings: [...exploration.findings, { id: String(exploration.findings.length + 1), direction, internal, learned }],
})

const updateLastPlan = (plans: DerivedPlan[], fn: (p: DerivedPlan) => DerivedPlan): DerivedPlan[] => {
  if (plans.length === 0) return plans
  return [...plans.slice(0, -1), fn(plans[plans.length - 1])]
}

const isInPerSection = (plan: DerivedPlan, stepIndex: number): boolean => {
  if (!plan.perSection) return false
  const { firstInnerStepIndex, innerStepCount } = plan.perSection
  return stepIndex >= firstInnerStepIndex && stepIndex < firstInnerStepIndex + innerStepCount
}

const isLastInnerStep = (plan: DerivedPlan, stepIndex: number): boolean => {
  if (!plan.perSection) return false
  const { firstInnerStepIndex, innerStepCount } = plan.perSection
  return stepIndex === firstInnerStepIndex + innerStepCount - 1
}

const hasMoreSections = (plan: DerivedPlan): boolean => {
  if (!plan.perSection) return false
  return plan.perSection.currentSection < plan.perSection.sections.length - 1
}

const resetInnerSteps = (steps: Step[], firstIndex: number, count: number): Step[] =>
  steps.map((s, i) =>
    i >= firstIndex && i < firstIndex + count
      ? { ...s, done: false, internal: null, summary: null }
      : s
  )

const processCompleteStep = (plan: DerivedPlan, internal: string | null, summary: string): DerivedPlan => {
  if (plan.currentStep === null) return plan

  const stepIndex = plan.currentStep
  const inPerSection = isInPerSection(plan, stepIndex)
  const lastInner = isLastInnerStep(plan, stepIndex)
  const moreSections = hasMoreSections(plan)

  // Mark current step done
  let newSteps = markStepDone(plan.steps, stepIndex, internal, summary)
  let newPerSection = plan.perSection

  if (inPerSection && lastInner && moreSections && newPerSection) {
    // Completed last inner step but more sections remain
    // Record section result, reset inner steps, advance section
    const currentSectionData = newPerSection.sections[newPerSection.currentSection]
    const innerResults = newSteps
      .slice(newPerSection.firstInnerStepIndex, newPerSection.firstInnerStepIndex + newPerSection.innerStepCount)
      .map((s) => ({ stepId: s.id, internal: s.internal, summary: s.summary }))

    const sectionResult: SectionResult = {
      sectionIndex: newPerSection.currentSection,
      file: currentSectionData.file,
      indexInFile: currentSectionData.indexInFile,
      innerResults,
    }

    newSteps = resetInnerSteps(newSteps, newPerSection.firstInnerStepIndex, newPerSection.innerStepCount)
    newPerSection = {
      ...newPerSection,
      currentSection: newPerSection.currentSection + 1,
      completedSections: [...newPerSection.completedSections, sectionResult],
    }

    return {
      ...plan,
      steps: newSteps,
      currentStep: newPerSection.firstInnerStepIndex,
      perSection: newPerSection,
    }
  }

  if (inPerSection && lastInner && !moreSections && newPerSection) {
    // Completed last inner step of last section - record final section result
    const currentSectionData = newPerSection.sections[newPerSection.currentSection]
    const innerResults = newSteps
      .slice(newPerSection.firstInnerStepIndex, newPerSection.firstInnerStepIndex + newPerSection.innerStepCount)
      .map((s) => ({ stepId: s.id, internal: s.internal, summary: s.summary }))

    const sectionResult: SectionResult = {
      sectionIndex: newPerSection.currentSection,
      file: currentSectionData.file,
      indexInFile: currentSectionData.indexInFile,
      innerResults,
    }

    newPerSection = {
      ...newPerSection,
      completedSections: [...newPerSection.completedSections, sectionResult],
    }
  }

  return {
    ...plan,
    steps: newSteps,
    currentStep: findCurrentStep(newSteps),
    perSection: newPerSection,
  }
}

const processToolCall = (derived: Derived, call: ToolCall, files: Files): Derived => {
  if (isAbort(call)) {
    return {
      plans: updateLastPlan(derived.plans, (p) => ({ ...p, aborted: true })),
      exploration: null,
    }
  }

  if (isCreatePlan(call)) {
    const clearExploration = derived.exploration?.completed ? derived.exploration : null
    return { plans: [...derived.plans, createPlanFromCall(call, files)], exploration: clearExploration }
  }

  if (isCompleteStep(call)) {
    const lastPlan = derived.plans.at(-1)
    if (!lastPlan || lastPlan.currentStep === null) return derived
    const internal = (call.args.internal as string) || null
    const summary = (call.args.summary as string) || ""
    return {
      ...derived,
      plans: updateLastPlan(derived.plans, (p) => processCompleteStep(p, internal, summary)),
    }
  }

  if (isStartExploration(call)) {
    return { ...derived, exploration: createExplorationFromCall(call) }
  }

  if (isExplorationStep(call) && derived.exploration && !derived.exploration.completed) {
    const direction = derived.exploration.currentDirection || ""
    const internal = (call.args.internal as string) || null
    const learned = call.args.learned as string
    const decision = call.args.decision as string
    const next = call.args.next as string | undefined
    const withFinding = addFinding(derived.exploration, direction, internal, learned)

    if (decision === "answer" || decision === "plan") {
      return { ...derived, exploration: { ...withFinding, currentDirection: null, completed: true } }
    }
    return { ...derived, exploration: { ...withFinding, currentDirection: next || null } }
  }

  return derived
}

const processBlock = (files: Files) => (derived: Derived, block: Block): Derived => {
  if (!isToolCallBlock(block)) return derived
  return block.calls.reduce((d, call) => processToolCall(d, call, files), derived)
}

export const derive = (history: Block[], files: Files = {}): Derived =>
  history.reduce(processBlock(files), { plans: [], exploration: null })

export const lastPlan = (d: Derived): DerivedPlan | null => d.plans.at(-1) ?? null

export const hasActivePlan = (d: Derived): boolean => {
  const plan = lastPlan(d)
  return plan !== null && plan.currentStep !== null && !plan.aborted
}

export const hasActiveExploration = (d: Derived): boolean =>
  d.exploration !== null && !d.exploration.completed

export type Mode = "chat" | "plan" | "exploration"

export const getMode = (d: Derived): Mode => {
  if (hasActiveExploration(d)) return "exploration"
  if (hasActivePlan(d)) return "plan"
  return "chat"
}

const isStepBoundary = (block: Block): boolean =>
  hasCall(block, "create_plan") || hasCall(block, "complete_step")

const isExplorationBoundary = (block: Block): boolean =>
  hasCall(block, "start_exploration") || hasCall(block, "exploration_step")

const isAgentAction = (block: Block): boolean =>
  block.type === "text" || block.type === "tool_call"

const countActionsSinceBoundary = (history: Block[], isBoundary: (b: Block) => boolean): number => {
  let count = 0
  for (let i = history.length - 1; i >= 0; i--) {
    const block = history[i]
    if (isBoundary(block)) break
    if (isAgentAction(block)) count++
  }
  return count
}

export const actionsSinceStepChange = (history: Block[]): number =>
  countActionsSinceBoundary(history, isStepBoundary)

export const actionsSinceExplorationChange = (history: Block[]): number =>
  countActionsSinceBoundary(history, isExplorationBoundary)
