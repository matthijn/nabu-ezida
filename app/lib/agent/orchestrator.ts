import type { AgentState, AgentMessage, ParsedResponse } from "~/lib/orchestrator"
import type { Message, ToolHandlers, CompactionBlock } from "~/lib/llm"
import {
  createInitialState,
  applyMessage,
  selectEndpoint,
  selectCurrentStepIndex,
  selectUncompactedMessages,
  hasUncompactedMessages,
  parseResponse,
  parsePlan,
} from "~/lib/orchestrator"
import { executeBlock } from "~/lib/llm"
import { getLlmUrl } from "~/lib/env"

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

const findAssistantMessage = (messages: Message[]): Message | undefined =>
  messages.find((m) => m.role === "assistant")

const buildStepPrompt = (state: AgentState, stepIndex: number): string => {
  if (!state.plan) return ""

  const step = state.plan.steps[stepIndex]
  const planOverview = state.plan.steps
    .map((s, i) => `${i + 1}. [${s.status}] ${s.description}`)
    .join("\n")

  return `
Plan:
${planOverview}

Current step: ${stepIndex + 1}. ${step.description}

Complete this step. When done, respond with STEP_COMPLETE followed by a brief result.
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
    sharedContext: state.compactions,
    toolHandlers,
    onStateChange: () => {},
    signal,
  })

const isCompactableMessage = (m: AgentMessage): boolean =>
  m.type === "text" || m.type === "step_done" || m.type === "done"

const messageToContent: Record<string, (m: AgentMessage) => string> = {
  text: (m) => (m as { content: string }).content,
  step_done: (m) => `Step completed: ${(m as { result: string }).result}`,
  done: (m) => `Task completed: ${(m as { result: string }).result}`,
}

const messagesToContent = (messages: AgentMessage[]): string =>
  messages
    .filter(isCompactableMessage)
    .map((m) => messageToContent[m.type]?.(m) ?? "")
    .filter(Boolean)
    .join("\n")

const compactState = async (
  compactions: CompactionBlock[],
  messages: AgentMessage[],
  signal?: AbortSignal
): Promise<CompactionBlock[] | null> => {
  const content = messagesToContent(messages)
  if (!content && compactions.length === 0) return null

  try {
    const url = getLlmUrl("/chat/compact")
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ compactions, content }),
      signal,
    })

    if (!response.ok) return null

    const data = await response.json()
    return data.compactions ?? null
  } catch {
    return null
  }
}

const converse = async (ctx: OrchestratorContext, userMessage: string): Promise<ParsedResponse | null> => {
  const result = await callLLM(ctx.state, userMessage, {}, ctx.opts.signal)
  const assistantMessage = findAssistantMessage(result.messages)

  if (!hasContent(assistantMessage)) {
    ctx.emit({ type: "error", message: "No response from LLM" })
    return null
  }

  return parseResponse(assistantMessage.content)
}

const planTask = async (ctx: OrchestratorContext, task: string): Promise<boolean> => {
  ctx.emit({ type: "task_detected", task })

  const result = await callLLM(ctx.state, task, {}, ctx.opts.signal)
  const assistantMessage = findAssistantMessage(result.messages)

  if (!hasContent(assistantMessage)) {
    ctx.emit({ type: "error", message: "Failed to create plan" })
    return false
  }

  const plan = parsePlan(assistantMessage.content)
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
    const assistantMessage = findAssistantMessage(result.messages)

    if (!hasContent(assistantMessage)) {
      attempts++
      continue
    }

    const parsed = parseResponse(assistantMessage.content)

    if (parsed.type === "step_complete") {
      ctx.emit({ type: "step_done", stepIndex, result: parsed.summary ?? "" })
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

const compactIfNeeded = async (ctx: OrchestratorContext): Promise<void> => {
  if (!hasUncompactedMessages(ctx.state)) return

  const uncompacted = selectUncompactedMessages(ctx.state)
  const compactions = await compactState(ctx.state.compactions, uncompacted, ctx.opts.signal)

  if (compactions) {
    ctx.emit({ type: "compacted", compactions })
  }
}

const executeAllSteps = async (ctx: OrchestratorContext): Promise<void> => {
  let stepIndex = selectCurrentStepIndex(ctx.state)

  while (stepIndex !== null) {
    ctx.emit({ type: "step_start", stepIndex })

    const result = await executeStep(ctx, stepIndex)
    if (result !== "complete") return

    stepIndex = selectCurrentStepIndex(ctx.state)
  }

  ctx.emit({ type: "done", result: "All steps completed" })
  await compactIfNeeded(ctx)
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
