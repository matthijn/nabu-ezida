import type { Block } from "../../types"
import type { Nudger, NudgeBlock } from "../nudge-tools"
import { systemNudge, withContext } from "../nudge-tools"
import type { DerivedPlan, Step, Section, SectionResult, Files, ThinkHard } from "../../derived"
import { derive, lastPlan, hasActivePlan, actionsSinceStepChange } from "../../derived"
import { findSingletonBlock, parseBlockJson } from "~/domain/blocks"
import { filterMatchingAnnotations } from "~/domain/attributes/annotations"
import { getCodeMapping } from "~/lib/files/selectors"
import { interpretContent, getPromptSchema } from "../../executors/interpret"
import type { DocumentMeta, StoredAnnotation } from "~/domain/attributes/schema"

const STUCK_LIMIT = 10

const lastBlock = (history: Block[]): Block | undefined => history[history.length - 1]

export const planNudge: Nudger = (history, files) => {
  const d = derive(history, files)
  const plan = lastPlan(d.plans)
  if (!plan) return null

  if (hasActivePlan(d.plans)) {
    const actions = actionsSinceStepChange(history)
    if (actions > STUCK_LIMIT) return null
    if (actions === STUCK_LIMIT) return buildStuckNudge(plan, plan.currentStep!)
    return buildPlanNudge(plan, plan.currentStep!, files)
  }

  if (plan.currentStep === null && !plan.aborted && lastBlock(history)?.type === "tool_result") {
    return buildPlanCompletedNudge(plan)
  }

  return null
}

const formatCompletedStep = (step: Step): string => {
  const internalPart = step.internal ? ` [context: ${step.internal}]` : ""
  return `${step.id}. [done] ${step.description} → "${step.summary}"${internalPart}`
}

const formatPendingStep = (step: Step): string =>
  `${step.id}. [pending] ${step.description}`

const formatCurrentStep = (step: Step): string =>
  `${step.id}. [current] ${step.description}  ← current\n   expected: "${step.expected}"`

const formatStep = (step: Step, currentIndex: number, index: number): string => {
  if (index === currentIndex) return formatCurrentStep(step)
  return step.done ? formatCompletedStep(step) : formatPendingStep(step)
}

const formatSectionResult = (result: SectionResult): string => {
  const innerSummaries = result.innerResults
    .map((r) => {
      const ctx = r.internal ? ` [context: ${r.internal}]` : ""
      return `"${r.summary}"${ctx}`
    })
    .join(" / ")
  return `- ${result.file} ${result.indexInFile}: ${innerSummaries}`
}

const formatSectionProgress = (section: Section, sectionIndex: number, totalSections: number): string =>
  `Section ${sectionIndex + 1}/${totalSections} (${section.file} ${section.indexInFile}/${section.totalInFile})`

type ResultEntry = {
  stepId: string
  description: string
  expected: string
  section: string | null
  summary: string | null
  internal: string | null
}

const collectResults = (plan: DerivedPlan): ResultEntry[] => {
  const results: ResultEntry[] = []
  const ps = plan.perSection

  for (const step of plan.steps) {
    if (!step.done) continue

    if (ps) {
      const { firstInnerStepIndex, innerStepCount } = ps
      const stepIndex = plan.steps.indexOf(step)
      const isInnerStep = stepIndex >= firstInnerStepIndex && stepIndex < firstInnerStepIndex + innerStepCount

      if (isInnerStep) {
        if (stepIndex === firstInnerStepIndex) {
          const totalSections = ps.sections.length
          for (const section of ps.completedSections) {
            for (const inner of section.innerResults) {
              const innerStep = plan.steps.find((s) => s.id === inner.stepId)
              results.push({
                stepId: inner.stepId,
                description: innerStep?.description ?? "",
                expected: innerStep?.expected ?? "",
                section: `${section.file} ${section.indexInFile}/${totalSections}`,
                summary: inner.summary,
                internal: inner.internal,
              })
            }
          }
        }
        continue
      }
    }

    results.push({
      stepId: step.id,
      description: step.description,
      expected: step.expected,
      section: null,
      summary: step.summary,
      internal: step.internal,
    })
  }

  return results
}

const formatResultEntry = (entry: ResultEntry): string => {
  const sectionPart = entry.section ? ` (${entry.section})` : ""
  const internalPart = entry.internal ? ` [context: ${entry.internal}]` : ""
  return `${entry.stepId}. ${entry.description}${sectionPart}:\n   expected: "${entry.expected}"\n   result: "${entry.summary ?? ""}"${internalPart}`
}

const formatPlanResults = (plan: DerivedPlan): string => {
  const results = collectResults(plan)
  const lines = results.map(formatResultEntry).join("\n")
  return `<plan-results task="${plan.task}">\n${lines}\n</plan-results>`
}

const getFileAttributes = (files: Files, filename: string): string | null => {
  const raw = files[filename]
  if (!raw) return null
  const block = findSingletonBlock(raw, "json-attributes")
  return block?.content ?? null
}

const formatFileSwitch = (files: Files, filename: string): string => {
  const attrs = getFileAttributes(files, filename)
  const attrsBlock = attrs
    ? `\n<attributes ${filename}>\n${attrs}\n</attributes>`
    : ""
  return `Switched to file: ${filename}${attrsBlock}\n`
}

const getFileAnnotations = (files: Files, filename: string): StoredAnnotation[] => {
  const raw = files[filename]
  if (!raw) return []
  const block = findSingletonBlock(raw, "json-attributes")
  if (!block) return []
  const meta = parseBlockJson<DocumentMeta>(block)
  return meta?.annotations ?? []
}

const formatSectionAnnotations = (
  files: Files,
  filename: string,
  sectionContent: string
): string => {
  const allAnnotations = getFileAnnotations(files, filename)
  const matching = filterMatchingAnnotations(allAnnotations, sectionContent)
  const data = { codes: getCodeMapping(files), annotations: matching }
  return `\n  <current-annotations>\n${JSON.stringify(data, null, 2)}\n  </current-annotations>`
}

const formatInterpretResult = (raw: string): string =>
  `\n  <interpretation>\n${raw}\n  </interpretation>`

type ThinkInput = {
  thinkHard: ThinkHard
  files: Files
  sectionContent: string
  sectionFile: string
}

const buildThinkContent = (input: ThinkInput): string => {
  const { thinkHard, files, sectionContent, sectionFile } = input
  if (thinkHard.mode !== "with-codebook") return sectionContent

  const allAnnotations = getFileAnnotations(files, sectionFile)
  const matching = filterMatchingAnnotations(allAnnotations, sectionContent)
  if (matching.length === 0) return sectionContent

  return `${sectionContent}\n\n<current-annotations>\n${JSON.stringify(matching, null, 2)}\n</current-annotations>`
}

const createThinkContext = (input: ThinkInput): (() => Promise<string>) => {
  const { thinkHard, files } = input
  return async () => {
    const lensFile = files[thinkHard.lens]
    if (!lensFile) {
      throw new Error(`Lens file not found: ${thinkHard.lens}`)
    }
    const content = buildThinkContent(input)
    const schema = getPromptSchema(thinkHard.mode)
    if (schema) {
      const result = await interpretContent(lensFile, content, thinkHard.mode, schema)
      return formatInterpretResult(JSON.stringify(result, null, 2))
    }
    const result = await interpretContent(lensFile, content, thinkHard.mode)
    return formatInterpretResult(result)
  }
}

const buildPerSectionNudge = (plan: DerivedPlan, stepIndex: number, files: Files): NudgeBlock => {
  const current = plan.steps[stepIndex]
  const ps = plan.perSection!
  const section = ps.sections[ps.currentSection]
  const totalSections = ps.sections.length

  const sectionProgress = formatSectionProgress(section, ps.currentSection, totalSections)

  const fileSwitch = section.indexInFile === 1
    ? formatFileSwitch(files, section.file)
    : ""

  const previousSections = ps.completedSections.length > 0
    ? `\nPrevious section results:\n${ps.completedSections.map(formatSectionResult).join("\n")}\n`
    : ""

  const stepList = plan.steps.map((s, i) => formatStep(s, stepIndex, i)).join("\n")

  const annotationsBlock = formatSectionAnnotations(files, section.file, section.content)

  const content = `EXECUTING STEP ${current.id}: ${current.description}
${sectionProgress}
${fileSwitch}
<section ${section.file} ${section.indexInFile}/${section.totalInFile}>
  <current-content>
${section.content}
  </current-content>${annotationsBlock}{context}
</section>
${previousSections}
${stepList}

INSTRUCTIONS:
1. Process the section above
2. When DONE, call complete_step with summary of what you accomplished
3. System will advance to next step or section automatically

If blocked: call abort with reason`

  const nudge = systemNudge(content)

  if (!plan.thinkHard) {
    return systemNudge(content.replace("{context}", ""))
  }

  return withContext(nudge, createThinkContext({
    thinkHard: plan.thinkHard,
    files,
    sectionContent: section.content,
    sectionFile: section.file,
  }))
}

const buildPlanNudge = (plan: DerivedPlan, stepIndex: number, files: Files): NudgeBlock => {
  if (plan.perSection) {
    const { firstInnerStepIndex, innerStepCount } = plan.perSection
    const inPerSection = stepIndex >= firstInnerStepIndex && stepIndex < firstInnerStepIndex + innerStepCount
    if (inPerSection) {
      return buildPerSectionNudge(plan, stepIndex, files)
    }
  }

  const current = plan.steps[stepIndex]
  const stepList = plan.steps.map((s, i) => formatStep(s, stepIndex, i)).join("\n")

  return systemNudge(`EXECUTING STEP ${current.id}: ${current.description}

${stepList}

INSTRUCTIONS:
1. Execute this step using available tools
2. When DONE, call complete_step with summary of what you accomplished
3. Do NOT proceed to next step - system will prompt you

If blocked: call abort with reason`)
}

const buildPlanCompletedNudge = (plan: DerivedPlan): NudgeBlock =>
  systemNudge(`PLAN COMPLETED

${formatPlanResults(plan)}

Summarize what was accomplished. Do NOT call any tools.`)

const buildStuckNudge = (plan: DerivedPlan, stepIndex: number): NudgeBlock =>
  systemNudge(`STUCK ON STEP ${plan.steps[stepIndex].id}: ${plan.steps[stepIndex].description}

You have made too many attempts without completing this step.

You MUST now either:
1. Call complete_step if the step is actually done
2. Call abort with a clear reason why you cannot complete this step

No other actions are allowed. Choose one NOW.`)
