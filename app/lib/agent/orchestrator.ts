import type { AgentState, AgentMessage, ParsedResponse } from "~/lib/orchestrator"
import type { Message, ToolHandlers } from "~/lib/llm"
import {
  createInitialState,
  applyMessage,
  selectEndpoint,
  selectCurrentStepIndex,
  parseResponse,
  parsePlan,
} from "~/lib/orchestrator"
import { executeBlock } from "~/lib/llm"

const MAX_STEP_ATTEMPTS = 5

type OrchestratorOptions = {
  toolHandlers: ToolHandlers
  onMessage: (msg: AgentMessage) => void
  onStateChange: (state: AgentState) => void
  signal?: AbortSignal
}

type Emitter = (msg: AgentMessage) => void

type OrchestratorContext = {
  state: AgentState
  emit: Emitter
  opts: OrchestratorOptions
}

const createEmitter = (
  getState: () => AgentState,
  setState: (s: AgentState) => void,
  opts: OrchestratorOptions
): Emitter => (msg: AgentMessage) => {
  const newState = applyMessage(getState(), msg)
  setState(newState)
  opts.onMessage(msg)
  opts.onStateChange(newState)
}

const toLLMMessages = (messages: AgentMessage[]): Message[] =>
  messages
    .filter((m): m is AgentMessage & { type: "text" } => m.type === "text")
    .map((m) => ({ role: "user" as const, content: m.content }))

const hasContent = (msg: { content?: string | null } | undefined): msg is { content: string } =>
  Boolean(msg?.content)

const isTaskResponse = (parsed: ParsedResponse): parsed is ParsedResponse & { type: "task"; task: string } =>
  parsed.type === "task" && Boolean((parsed as { task?: string }).task)

const buildStepPrompt = (state: AgentState, stepIndex: number): string => {
  if (!state.plan) return ""

  const step = state.plan.steps[stepIndex]
  const planSummary = state.plan.steps
    .map((s, i) => `${i + 1}. [${s.status}] ${s.description}`)
    .join("\n")

  return `
Plan:
${planSummary}

Current step: ${stepIndex + 1}. ${step.description}

Complete this step. When done, respond with STEP_COMPLETE followed by a brief summary.
If you're stuck, explain what's blocking you.
`.trim()
}

const callLLM = async (
  state: AgentState,
  message: string,
  toolHandlers: ToolHandlers,
  signal?: AbortSignal
) =>
  executeBlock({
    prompt: selectEndpoint(state),
    initialMessage: message,
    history: toLLMMessages(state.messages),
    sharedContext: [],
    toolHandlers,
    onStateChange: () => {},
    signal,
  })

const converse = async (ctx: OrchestratorContext, userMessage: string): Promise<ParsedResponse | null> => {
  const result = await callLLM(ctx.state, userMessage, {}, ctx.opts.signal)
  const lastMessage = result.messages.find((m) => m.role === "assistant")

  if (!hasContent(lastMessage)) {
    ctx.emit({ type: "error", message: "No response from LLM" })
    return null
  }

  return parseResponse(lastMessage.content)
}

const planTask = async (ctx: OrchestratorContext, task: string): Promise<boolean> => {
  ctx.emit({ type: "task_detected", task })

  const result = await callLLM(ctx.state, task, {}, ctx.opts.signal)
  const planMessage = result.messages.find((m) => m.role === "assistant")

  if (!hasContent(planMessage)) {
    ctx.emit({ type: "error", message: "Failed to create plan" })
    return false
  }

  const plan = parsePlan(planMessage.content)
  if (!plan) {
    ctx.emit({ type: "error", message: "Failed to parse plan" })
    return false
  }

  ctx.emit({ type: "plan", plan })
  return true
}

const executeStep = async (
  ctx: OrchestratorContext,
  stepIndex: number
): Promise<"complete" | "stuck" | "error"> => {
  let attempts = 0

  while (attempts < MAX_STEP_ATTEMPTS) {
    if (ctx.opts.signal?.aborted) {
      ctx.emit({ type: "error", message: "Aborted" })
      return "error"
    }

    const stepPrompt = buildStepPrompt(ctx.state, stepIndex)
    const result = await callLLM(ctx.state, stepPrompt, ctx.opts.toolHandlers, ctx.opts.signal)
    const stepMessage = result.messages.find((m) => m.role === "assistant")

    if (!hasContent(stepMessage)) {
      attempts++
      continue
    }

    const parsed = parseResponse(stepMessage.content)

    if (parsed.type === "step_complete") {
      ctx.emit({ type: "step_done", stepIndex, summary: parsed.summary ?? "" })
      return "complete"
    }

    if (parsed.type === "stuck") {
      ctx.emit({ type: "stuck", stepIndex, question: parsed.question ?? "What should I do?" })
      return "stuck"
    }

    attempts++
  }

  ctx.emit({ type: "stuck", stepIndex, question: "Unable to complete step after multiple attempts. What should I do?" })
  return "stuck"
}

const executeAllSteps = async (ctx: OrchestratorContext): Promise<void> => {
  let stepIndex = selectCurrentStepIndex(ctx.state)

  while (stepIndex !== null) {
    ctx.emit({ type: "step_start", stepIndex })

    const result = await executeStep(ctx, stepIndex)
    if (result !== "complete") return

    stepIndex = selectCurrentStepIndex(ctx.state)
  }

  ctx.emit({ type: "done", summary: "All steps completed" })
}

export const runAgent = async (
  userMessage: string,
  initialState: AgentState | null,
  opts: OrchestratorOptions
): Promise<AgentState> => {
  let state = initialState ?? createInitialState()

  const emit = createEmitter(
    () => state,
    (s) => { state = s },
    opts
  )

  const ctx: OrchestratorContext = { state, emit, opts }

  emit({ type: "text", content: userMessage })

  const parsed = await converse(ctx, userMessage)
  if (!parsed) return state

  if (parsed.type === "text") {
    emit({ type: "text", content: parsed.content ?? "" })
    return state
  }

  if (isTaskResponse(parsed)) {
    const planned = await planTask(ctx, parsed.task)
    if (planned) {
      await executeAllSteps(ctx)
    }
  }

  return state
}
