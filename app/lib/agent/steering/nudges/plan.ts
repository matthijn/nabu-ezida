import type { Block, SystemBlock } from "../../types"
import type { Nudger, NudgeBlock, NudgeContext } from "../nudge-tools"
import { systemNudge, withContext } from "../nudge-tools"
import type { DerivedPlan, Step, Section, SectionResult, Files, AskExpertConfig } from "../../derived"
import { derive, lastPlan, hasActivePlan, actionsSinceStepChange, isPlanPaused } from "../../derived"
import { findSingletonBlock, parseBlockJson } from "~/domain/blocks"
import { filterMatchingAnnotations } from "~/domain/attributes/annotations"
import { getCodeMapping } from "~/lib/files/selectors"
import type { DocumentMeta, StoredAnnotation } from "~/domain/attributes/schema"
import { createShell } from "../../executors/shell/shell"
import { getAgentTools, runExpertWithTools, runExpertFreeform, appendInstructions } from "../../executors/ask-expert"

const isStepBoundary = (block: Block): boolean =>
  block.type === "tool_call" && block.calls.some((c) => c.name === "create_plan" || c.name === "complete_step")

const EXPERT_MARKER_PREFIX = "<!-- expert-result:"

const makeExpertMarker = (section: number): string =>
  `${EXPERT_MARKER_PREFIX}${section} -->`

const isExpertMarker = (block: Block, section: number): boolean =>
  block.type === "system" && block.content.startsWith(makeExpertMarker(section))

export const findExpertResultForSection = (history: Block[], section: number): SystemBlock | null => {
  for (let i = history.length - 1; i >= 0; i--) {
    const block = history[i]
    if (isStepBoundary(block)) return null
    if (isExpertMarker(block, section)) return block as SystemBlock
  }
  return null
}

const STUCK_LIMIT = 10

const lastBlock = (history: Block[]): Block | undefined => history[history.length - 1]

const isNudgeTrigger = (block: Block | undefined): boolean =>
  block?.type === "user" || block?.type === "tool_result"

export const createPlanNudge = (getFiles: () => Files): Nudger => (history) => {
  const files = getFiles()
  const d = derive(history, files)
  const plan = lastPlan(d.plans)
  if (!plan) return null

  if (hasActivePlan(d.plans)) {
    if (isPlanPaused(history)) {
      if (isNudgeTrigger(lastBlock(history))) return buildPausedPlanNudge(plan, plan.currentStep!)
      return null
    }
    const actions = actionsSinceStepChange(history)
    if (actions > STUCK_LIMIT) return null
    if (actions === STUCK_LIMIT) return buildStuckNudge(plan, plan.currentStep!)
    return buildPlanNudge(plan, plan.currentStep!, files, history)
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

const formatAnalysisResult = (raw: string): string =>
  `\n  <analysis>\n${raw}\n  </analysis>`

type AskExpertInput = {
  askExpert: AskExpertConfig
  files: Files
  sectionContent: string
  sectionFile: string
  sectionIndex: number
  totalSections: number
}

const formatSectionHeader = (file: string, index: number, total: number): string =>
  `File: ${file}\nPart: ${index} of ${total}\n\n`

const buildExpertContent = (input: AskExpertInput): string => {
  const { askExpert, files, sectionContent, sectionFile, sectionIndex, totalSections } = input
  const header = formatSectionHeader(sectionFile, sectionIndex, totalSections)

  if (askExpert.task !== "apply-codebook") return `${header}${sectionContent}`

  const allAnnotations = getFileAnnotations(files, sectionFile)
  const matching = filterMatchingAnnotations(allAnnotations, sectionContent)
  if (matching.length === 0) return `${header}${sectionContent}`

  return `${header}${sectionContent}\n\n<current-annotations>\n${JSON.stringify(matching, null, 2)}\n</current-annotations>`
}

const resolveShellCommand = (files: Files, command: string): string | null => {
  const fileMap = new Map(Object.entries(files))
  const shell = createShell(fileMap)
  const result = shell.exec(command)
  if (result.isError) return null
  return result.output
}

const toExpertResultBlock = (input: AskExpertInput, content: string): SystemBlock => ({
  type: "system",
  content: `${makeExpertMarker(input.sectionIndex)}\n${content}`,
})

const createAskExpertContext = (input: AskExpertInput): (() => Promise<NudgeContext>) => {
  const { askExpert, files } = input
  return async () => {
    const framework = resolveShellCommand(files, askExpert.using)
    if (!framework) {
      throw new Error(`Failed to resolve framework: ${askExpert.using}`)
    }

    const content = appendInstructions(buildExpertContent(input), askExpert.instructions)
    const messages: Block[] = [
      { type: "system", content: framework },
      { type: "system", content },
    ]

    const tools = getAgentTools(askExpert.expert, askExpert.task ?? null)
    const analysisText = tools
      ? (await runExpertWithTools(askExpert.expert, askExpert.task ?? null, messages, tools)).orchestrator_summary
      : await runExpertFreeform(askExpert.expert, askExpert.task ?? null, messages)

    const analysisContent = formatAnalysisResult(analysisText)
    return {
      text: analysisContent,
      blocks: [toExpertResultBlock(input, analysisContent)],
    }
  }
}

const buildPerSectionNudge = (plan: DerivedPlan, stepIndex: number, files: Files, history: Block[]): NudgeBlock => {
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
  </current-content>${annotationsBlock}
</section>
${previousSections}
${stepList}

INSTRUCTIONS:
1. Process the section above
2. When DONE, call complete_step with summary of what you accomplished
3. System will advance to next step or section automatically

If blocked: call abort with reason`

  const isFirstInnerStep = stepIndex === ps.firstInnerStepIndex
  const hasExpertConfig = plan.askExpert && isFirstInnerStep
  const alreadyHasExpertResult = hasExpertConfig && findExpertResultForSection(history, section.indexInFile) !== null

  if (!hasExpertConfig || alreadyHasExpertResult) {
    return systemNudge(content)
  }

  return withContext(systemNudge(content), createAskExpertContext({
    askExpert: plan.askExpert!,
    files,
    sectionContent: section.content,
    sectionFile: section.file,
    sectionIndex: section.indexInFile,
    totalSections: section.totalInFile,
  }))
}

const buildPlanNudge = (plan: DerivedPlan, stepIndex: number, files: Files, history: Block[]): NudgeBlock => {
  if (plan.perSection) {
    const { firstInnerStepIndex, innerStepCount } = plan.perSection
    const inPerSection = stepIndex >= firstInnerStepIndex && stepIndex < firstInnerStepIndex + innerStepCount
    if (inPerSection) {
      return buildPerSectionNudge(plan, stepIndex, files, history)
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

const buildPausedPlanNudge = (plan: DerivedPlan, stepIndex: number): NudgeBlock => {
  const current = plan.steps[stepIndex]
  return systemNudge(`PLAN PAUSED — Step ${current.id}: ${current.description}
Expected: "${current.expected}"

You are currently in a paused plan. Did you gather enough info?
- Continue executing the current step
- Collect more info (keep conversing)
- Call abort to stop the plan`)
}

const buildStuckNudge = (plan: DerivedPlan, stepIndex: number): NudgeBlock =>
  systemNudge(`STUCK ON STEP ${plan.steps[stepIndex].id}: ${plan.steps[stepIndex].description}

You have made too many attempts without completing this step.

You MUST now either:
1. Call complete_step if the step is actually done
2. Call abort with a clear reason why you cannot complete this step

No other actions are allowed. Choose one NOW.`)
