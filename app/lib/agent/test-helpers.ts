import type { Block, BlockOrigin } from "./types"
import type { TaggedBlock } from "./block-store"
import type { StepDef, StepDefObject } from "./derived"

let callIdCounter = 0
const nextCallId = (): string => String(++callIdCounter)
export const resetCallIdCounter = (): void => { callIdCounter = 0 }

type StepInput = string | StepDefObject | { per_section: (string | StepDefObject)[]; files: string[] }

const toStepDef = (input: StepInput): StepDef => {
  if (typeof input === "string") {
    return { title: input, expected: `${input} done` }
  }
  if ("per_section" in input) {
    return {
      per_section: input.per_section.map((s) =>
        typeof s === "string" ? { title: s, expected: `${s} done` } : s
      ),
      files: input.files,
    }
  }
  return input
}

const withResult = (callId: string, call: Block): Block[] => [
  call,
  { type: "tool_result", callId, result: { status: "ok" } },
]

type CreatePlanOptions = {
  askExpert?: { expert: string; task?: string; using: string }
}

export const createPlanCall = (task: string, steps: StepInput[], options?: CreatePlanOptions): Block[] => {
  const id = nextCallId()
  const args: Record<string, unknown> = { task, steps: steps.map(toStepDef) }

  if (options?.askExpert) args.ask_expert = options.askExpert

  return withResult(id, {
    type: "tool_call",
    calls: [{ id, name: "create_plan", args }],
  })
}

export const completeSubstepCall = (): Block[] => {
  const id = nextCallId()
  return withResult(id, {
    type: "tool_call",
    calls: [{ id, name: "complete_substep", args: {} }],
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

export const origin = (agent: string, instance: string): BlockOrigin => ({ agent, instance })

export const tagged = (instance: string, blocks: Block[]): TaggedBlock[] =>
  blocks.map((block) => ({ ...block, origin: { agent: instance.replace(/-\d+$/, ""), instance } }))
