import type { Message, ToolHandlers } from "~/lib/llm"

export type Path = "/chat/converse" | "/chat/plan" | "/chat/execute"

export type StepStatus = "pending" | "done"

export type Step = {
  id: string
  description: string
  status: StepStatus
}

export type Plan = {
  task: string
  steps: Step[]
}

export type AgentState = {
  history: Message[]
  path: Path
  plan: Plan | null
}

export type StepResult = {
  state: AgentState
  response: string
  needsUser: boolean
}

export type OnChunk = (chunk: string) => void

export type LLMCaller = (
  path: Path,
  messages: Message[],
  onChunk?: OnChunk,
  signal?: AbortSignal
) => Promise<{ content: string; toolCalls?: { id: string; name: string; args: unknown }[] }>

export type StepOptions = {
  callLLM: LLMCaller
  maxCallsPerStep?: number
  toolHandlers?: ToolHandlers
  onChunk?: OnChunk
  signal?: AbortSignal
}

export const createInitialState = (): AgentState => ({
  history: [],
  path: "/chat/converse",
  plan: null,
})
