import type { Block } from "./types"
import type { StepDef, StepDefObject } from "./derived"
import type { NudgeTools } from "./steering"

export const orchestratorTools: NudgeTools = [
  { name: "orientate" },
  { name: "reorient" },
  { name: "run_local_shell" },
]

let callIdCounter = 0
const nextCallId = (): string => String(++callIdCounter)
export const resetCallIdCounter = (): void => { callIdCounter = 0 }

type StepInput = string | StepDefObject | { per_section: (string | StepDefObject)[] }

const toStepDef = (input: StepInput): StepDef => {
  if (typeof input === "string") {
    return { title: input, expected: `${input} done` }
  }
  if ("per_section" in input) {
    return {
      per_section: input.per_section.map((s) =>
        typeof s === "string" ? { title: s, expected: `${s} done` } : s
      ),
    }
  }
  return input
}

const withResult = (callId: string, call: Block): Block[] => [
  call,
  { type: "tool_result", callId, result: { status: "ok" } },
]

type CreatePlanOptions = {
  files?: string[]
  askExpert?: { expert: string; task?: string; using: string }
}

export const createPlanCall = (task: string, steps: StepInput[], filesOrOptions?: string[] | CreatePlanOptions): Block[] => {
  const id = nextCallId()
  const args: Record<string, unknown> = { task, steps: steps.map(toStepDef) }

  if (Array.isArray(filesOrOptions)) {
    args.files = filesOrOptions
  } else if (filesOrOptions) {
    if (filesOrOptions.files) args.files = filesOrOptions.files
    if (filesOrOptions.askExpert) args.ask_expert = filesOrOptions.askExpert
  }

  return withResult(id, {
    type: "tool_call",
    calls: [{ id, name: "create_plan", args }],
  })
}

export const completeStepCall = (summary = "Done", internal?: string): Block[] => {
  const id = nextCallId()
  return withResult(id, {
    type: "tool_call",
    calls: [{ id, name: "complete_step", args: { summary, internal } }],
  })
}

export const abortCall = (message = "Stopping"): Block[] => {
  const id = nextCallId()
  return withResult(id, {
    type: "tool_call",
    calls: [{ id, name: "abort", args: { message } }],
  })
}

export const orientateCall = (question: string, direction?: string): Block[] => {
  const id = nextCallId()
  return withResult(id, {
    type: "tool_call",
    calls: [{ id, name: "orientate", args: { question, direction } }],
  })
}

export const reorientCall = (internal: string, learned: string, decision: string, next?: string): Block[] => {
  const id = nextCallId()
  return withResult(id, {
    type: "tool_call",
    calls: [{ id, name: "reorient", args: { internal, learned, decision, next } }],
  })
}

export const toolResult = (callId: string, result: unknown = { status: "ok" }): Block => ({
  type: "tool_result",
  callId,
  result,
})

export const textBlock = (content: string): Block => ({
  type: "text",
  content,
})

export const userBlock = (content: string): Block => ({
  type: "user",
  content,
})
