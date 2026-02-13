import { z } from "zod"
import type { AnyTool } from "./tool"

type ExpertEntry = { key: string; description: string }

const taskFields = {
  intent: z.string().describe("The task in one sentence. What you want accomplished. Describe the goal, not the method — the receiver decides how."),
  outcome: z.string().optional().describe("What done looks like. The receiver checks its work against this. Be specific enough that both sender and receiver agree when it's met."),
  context: z.string().optional().describe("What the receiver needs to know or read before starting. Can include file paths, background, domain info, or references. The receiver decides whether and how to load any referenced material."),
  involvement: z.string().optional().describe("How autonomous the receiver is. When should it pause for the user? Examples: 'fully autonomous', 'check in if anything is ambiguous', 'show me each step before proceeding'."),
  constraints: z.string().optional().describe("Rules the receiver must follow. What to do, what not to do, and any quality standards or conventions to respect."),
}

const formatExpertList = (experts: ExpertEntry[]): string =>
  experts.map((e) => `- **${e.key}**: ${e.description}`).join("\n")

export const buildDelegateTool = (experts: ExpertEntry[]): AnyTool => {
  const keys = experts.map((e) => e.key) as [string, ...string[]]
  const list = formatExpertList(experts)

  return {
    name: "delegate",
    description: `Send a task to an expert agent for execution.\n\nAvailable experts:\n${list}`,
    schema: z.object({
      who: z.enum(keys).describe(`Which expert to delegate to.\n\n${list}`),
      ...taskFields,
    }),
  }
}

export const orchestrateTool: AnyTool = {
  name: "orchestrate",
  description: "Delegate complex work into a planned, structured execution with fresh context. Use when the task has multiple steps, spans files, or benefits from upfront planning. The work is taken over entirely — you receive the result when done.",
  schema: z.object(taskFields),
}

export const TaskArgs = z.object({
  who: z.string(),
  ...taskFields,
})

export const OrchestrateArgs = z.object(taskFields)

export const forEachTool: AnyTool = {
  name: "for_each",
  description: "Apply the same task to each file independently with full conversation context. Each file is processed in a fresh branch that sees the full history plus accumulated results from prior files. Use when you need to do the same work across multiple files.",
  schema: z.object({
    files: z.array(z.string()).describe("File paths to process, one per branch."),
    task: z.string().describe("What to do with each file. The branch receives the file content, its annotations, and all prior branch results."),
  }),
}

export const ForEachArgs = z.object({
  files: z.array(z.string()),
  task: z.string(),
})
