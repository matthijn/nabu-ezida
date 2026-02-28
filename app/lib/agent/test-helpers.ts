import type { Block } from "./types"
import type { StepDef, StepDefObject } from "./derived"

let callIdCounter = 0
const nextCallId = (): string => String(++callIdCounter)
export const resetCallIdCounter = (): void => { callIdCounter = 0 }

type StepInput = string | StepDefObject | { nested: (string | StepDefObject)[] }

const toStepDef = (input: StepInput): StepDef => {
  if (typeof input === "string") {
    return { title: input, expected: `${input} done` }
  }
  if ("nested" in input) {
    return {
      nested: input.nested.map((s) =>
        typeof s === "string" ? { title: s, expected: `${s} done` } : s
      ),
    }
  }
  return input
}

const toolName = (call: Block): string | undefined =>
  call.type === "tool_call" ? call.calls[0]?.name : undefined

const withResult = (callId: string, call: Block): Block[] => [
  call,
  { type: "tool_result", callId, toolName: toolName(call), result: { status: "ok" } },
]

export const submitPlanCall = (task: string, steps: StepInput[]): Block[] => {
  const id = nextCallId()
  const args: Record<string, unknown> = { task, steps: steps.map(toStepDef) }

  return withResult(id, {
    type: "tool_call",
    calls: [{ id, name: "submit_plan", args }],
  })
}

export const completeStepCall = (summary = "Done", internal?: string): Block[] => {
  const id = nextCallId()
  return withResult(id, {
    type: "tool_call",
    calls: [{ id, name: "complete_step", args: { summary, internal } }],
  })
}

export const cancelCall = (reason = "Stopping", need?: string): Block[] => {
  const id = nextCallId()
  return withResult(id, {
    type: "tool_call",
    calls: [{ id, name: "cancel", args: { reason, need } }],
  })
}

export const askCallPending = (question: string, options: string[]): Block[] => {
  const id = nextCallId()
  return [{
    type: "tool_call",
    calls: [{ id, name: "ask", args: { question, options } }],
  }]
}

export const askCall = (question: string, options: string[], answer: string): Block[] => {
  const id = nextCallId()
  return [
    { type: "tool_call", calls: [{ id, name: "ask", args: { question, options } }] },
    { type: "user" as const, content: answer },
    { type: "tool_result", callId: id, result: { status: "ok", output: answer } },
  ]
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

export const systemBlock = (content: string): Block => ({
  type: "system",
  content,
})

export const toolCallBlock = (name: string, id = "1", args: Record<string, unknown> = {}): Block => ({
  type: "tool_call",
  calls: [{ id, name, args }],
})

export const terminalResult = (toolName: string, callId: string, result: unknown = { status: "ok", output: {} }): Block => ({
  type: "tool_result",
  callId,
  toolName,
  result,
})
