import { z } from "zod"
import type { Handler, HandlerResult } from "../types"

export const createPlan: Handler<null> = async (_files, args) => {
  const validationError = validateCreatePlan(args)
  return validationError ? { status: "error", output: validationError.error, mutations: [] } : ok
}

export const completeStep: Handler<null> = async (_files, args) => {
  const result = CompleteStepArgs.safeParse(args)
  return result.success ? ok : toError(result.error)
}

export const abort: Handler<null> = async (_files, args) => {
  const result = AbortArgs.safeParse(args)
  return result.success ? ok : toError(result.error)
}

export const startExploration: Handler<null> = async (_files, args) => {
  const result = StartExplorationArgs.safeParse(args)
  return result.success ? ok : toError(result.error)
}

export const explorationStep: Handler<null> = async (_files, args) => {
  const result = ExplorationStepArgs.safeParse(args)
  return result.success ? ok : toError(result.error)
}

const ok: HandlerResult<null> = { status: "ok", output: null, mutations: [] }

const StepObject = z.object({
  title: z.string().min(1, "title required"),
  expected: z.string().min(1, "expected required - what should this step produce?"),
})

const CreatePlanBase = z.object({
  task: z.string().min(1, "task description required - what are we trying to accomplish?"),
  steps: z.array(z.unknown()).min(1, "steps array required - break the task into steps"),
  files: z.array(z.string()).optional(),
})

const CompleteStepArgs = z.object({
  summary: z.string().min(1, "summary required - what did you accomplish in this step?"),
  internal: z.string().min(1, "internal required - capture context, findings, or notes for later"),
})

const AbortArgs = z.object({
  reason: z.string().min(1, "reason required - why can't this step be completed?"),
})

const StartExplorationArgs = z.object({
  question: z.string().min(1, "question required - what are we trying to answer?"),
  direction: z.string().min(1, "direction required - what will you investigate first?"),
})

const ExplorationStepArgs = z.object({
  internal: z.string().min(1, "internal required - capture IDs, query results, technical details for next steps"),
  learned: z.string().min(1, "learned required - what did you discover?"),
  decision: z.enum(["continue", "answer", "plan"]),
  next: z.string().optional(),
})

const formatZodError = (error: z.ZodError): string =>
  error.issues.map((i) => i.path.length ? `${i.path.join(".")}: ${i.message}` : i.message).join(", ")

const toError = (error: z.ZodError): HandlerResult<null> => ({
  status: "error",
  output: formatZodError(error),
  mutations: [],
})

const validateCreatePlan = (args: unknown): { error: string } | null => {
  const base = CreatePlanBase.safeParse(args)
  if (!base.success) return { error: formatZodError(base.error) }

  const stepErrors = base.data.steps.flatMap((step, i) => validateStep(step, i))
  if (stepErrors.length > 0) return { error: stepErrors.join(", ") }

  return null
}

const validateStep = (step: unknown, index: number): string[] => {
  if (typeof step !== "object" || step === null) {
    return [`steps.${index}: step must be {title, expected} or {per_section: [...]}`]
  }

  if ("per_section" in step) {
    const ps = (step as { per_section: unknown }).per_section
    if (!Array.isArray(ps)) return [`steps.${index}.per_section: must be array`]
    if (ps.length === 0) return [`steps.${index}.per_section: needs at least one step`]
    return ps.map((item, i) => validatePerSectionItem(item, index, i)).filter((e): e is string => e !== null)
  }

  const r = StepObject.safeParse(step)
  return r.success ? [] : [`steps.${index}: ${formatZodError(r.error)}`]
}

const validatePerSectionItem = (item: unknown, stepIdx: number, itemIdx: number): string | null => {
  const path = `steps.${stepIdx}.per_section.${itemIdx}`
  const r = StepObject.safeParse(item)
  return r.success ? null : `${path}: ${formatZodError(r.error)}`
}
