import { z } from "zod"
import type { AnyTool } from "./tool"

type ExpertEntry = { key: string; description: string }

const taskFields = {
  intent: z.string().describe("What the user wants, in one sentence. Pass along the goal — the receiver decides how to approach it."),
  context: z.string().optional().describe("Relevant file paths, background, or anything the receiver needs to get started."),
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

export const executeWithPlanTool: AnyTool = {
  name: "execute_with_plan",
  description: "Delegate complex work into a planned, structured execution with fresh context. Use when the task has multiple steps, spans files, or benefits from upfront planning. The work is taken over entirely — you receive the result when done.",
  schema: z.object(taskFields),
}

export const TaskArgs = z.object({
  who: z.string(),
  ...taskFields,
})

export const ExecuteWithPlanArgs = z.object(taskFields)

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
