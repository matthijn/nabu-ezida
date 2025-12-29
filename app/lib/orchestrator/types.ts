export type StepStatus = "pending" | "in_progress" | "done" | "error"

export type Step = {
  id: string
  description: string
  status: StepStatus
}

export type Plan = {
  task: string
  steps: Step[]
}

export type AgentMode = "converse" | "task"

export type AgentMessage =
  | { type: "text"; content: string }
  | { type: "thinking"; content: string }
  | { type: "task_detected"; task: string }
  | { type: "plan"; plan: Plan }
  | { type: "step_start"; stepIndex: number }
  | { type: "step_done"; stepIndex: number; summary: string }
  | { type: "stuck"; stepIndex: number; question: string }
  | { type: "error"; message: string }
  | { type: "done"; summary: string }

export type AgentState = {
  mode: AgentMode
  messages: AgentMessage[]
  plan: Plan | null
}

export type LLMResponse = {
  content: string
  taskDetected?: boolean
  task?: string
  stepComplete?: boolean
  stepSummary?: string
  plan?: Plan
}
