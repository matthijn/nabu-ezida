import { afterToolResult, alreadyFired, systemNudge, type Nudger } from "../nudge-tools"
import type { Files, DerivedPlan, Step, PerSectionConfig } from "../../derived"
import { derive, lastPlan, hasActivePlan } from "../../derived"

const formatSectionHeader = (ps: PerSectionConfig): string => {
  const section = ps.sections[ps.currentSection]
  return `Section ${ps.currentSection + 1}/${ps.sections.length} (${section.file}, ${section.indexInFile} of ${section.totalInFile})`
}

export const formatStepLine = (step: Step): string =>
  step.done ? `[done] ${step.description}` : `[    ] ${step.description}`

export const formatStepProgress = (plan: DerivedPlan): string => {
  if (!plan.perSection) return plan.steps.map(formatStepLine).join("\n")
  const ps = plan.perSection
  const innerSteps = plan.steps.slice(ps.firstInnerStepIndex, ps.firstInnerStepIndex + ps.innerStepCount)
  const before = plan.steps.slice(0, ps.firstInnerStepIndex)
  const after = plan.steps.slice(ps.firstInnerStepIndex + ps.innerStepCount)
  return [...before, ...innerSteps, ...after].map(formatStepLine).join("\n")
}

const sectionMarker = (sectionIndex: number): string =>
  `[section:${sectionIndex}]`

export const createStepStateNudge = (getFiles: () => Files): Nudger => (history) => {
  if (!afterToolResult(history)) return null

  const d = derive(history, getFiles())
  if (!hasActivePlan(d.plans)) return null

  const plan = lastPlan(d.plans)
  if (!plan?.perSection) return null

  const ps = plan.perSection
  const marker = sectionMarker(ps.currentSection)

  if (alreadyFired(history, marker)) return null

  const section = ps.sections[ps.currentSection]
  const header = formatSectionHeader(ps)
  const progress = formatStepProgress(plan)

  return systemNudge([marker, header, "", progress, "", "---", "", section.content].join("\n"))
}
