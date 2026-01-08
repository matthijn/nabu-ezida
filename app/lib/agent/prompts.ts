import type { DocumentContext, BlockContext } from "~/lib/threads/store"

type Step = { description: string; done: boolean }
type Finding = { direction: string; learned: string }
type Exploration = { question: string; currentDirection: string | null; findings: Finding[] }
type Plan = { steps: Step[] }

// --- Plan Nudge ---

const PLAN_NUDGE = `Plan:
{steps}

Continue with step {stepNumber}: {stepDescription}`

const formatStep = (step: Step, index: number): string =>
  `${index + 1}. [${step.done ? "done" : "pending"}] ${step.description}`

export const buildPlanNudge = (plan: Plan, stepIndex: number): string =>
  PLAN_NUDGE
    .replace("{steps}", plan.steps.map(formatStep).join("\n"))
    .replace("{stepNumber}", String(stepIndex + 1))
    .replace("{stepDescription}", plan.steps[stepIndex].description)

// --- Exploration Nudge ---

const EXPLORATION_NUDGE = `Exploring: {question}{direction}

Investigate and call exploration_step with what you learn.`

const EXPLORATION_NUDGE_WITH_FINDINGS = `Exploring: {question}

Findings so far:
{findings}{direction}

Continue investigating, or decide: answer | plan`

const formatFinding = (finding: Finding, index: number): string =>
  `${index + 1}. [${finding.direction}] ${finding.learned}`

const formatDirection = (dir: string | null): string =>
  dir ? `\n\nNext: ${dir}` : ""

export const buildExplorationNudge = (exploration: Exploration): string => {
  const direction = formatDirection(exploration.currentDirection)

  if (exploration.findings.length === 0) {
    return EXPLORATION_NUDGE
      .replace("{question}", exploration.question)
      .replace("{direction}", direction)
  }

  return EXPLORATION_NUDGE_WITH_FINDINGS
    .replace("{question}", exploration.question)
    .replace("{findings}", exploration.findings.map(formatFinding).join("\n"))
    .replace("{direction}", direction)
}

// --- Document Context ---

const DOCUMENT_CONTEXT = `Document: "{documentName}" ({documentId})

Position in document:
{beforeBlock}
-> [you are here]
{afterBlock}`

const formatBlock = (block: BlockContext, label: string): string =>
  `${label}: [${block.type}] "${block.textContent}"`

export const buildDocumentContext = (ctx: DocumentContext): string =>
  DOCUMENT_CONTEXT
    .replace("{documentName}", ctx.documentName)
    .replace("{documentId}", ctx.documentId)
    .replace("{beforeBlock}", ctx.blockBefore ? formatBlock(ctx.blockBefore, "Before") : "[head]")
    .replace("{afterBlock}", ctx.blockAfter ? formatBlock(ctx.blockAfter, "After") : "[tail]")
