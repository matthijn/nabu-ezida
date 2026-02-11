import { z } from "zod"
import { tool, registerTool, ok } from "./tool"

const OrientateArgs = z.object({
  question: z.string().min(1).describe("The question we need to understand before acting"),
  direction: z.string().min(1).describe("Initial direction or area to investigate"),
})

export const orientate = registerTool(
  tool({
    name: "orientate",
    description: `Begin orienting on a task.

Use when you need to understand the landscape before creating a plan. State your question and initial investigation direction.`,
    schema: OrientateArgs,
    handler: async () => ok(null),
  })
)

const ReorientArgs = z.object({
  internal: z
    .string()
    .min(1)
    .describe("Technical details, IDs, query results to remember for next steps"),
  learned: z.string().min(1).describe("Key discoveries from this step"),
  decision: z.enum(["continue", "answer", "plan"]).describe("continue orienting, answer the question, or create a plan"),
  next: z.string().optional().describe("What to investigate next (if continuing)"),
})

export const reorient = registerTool(
  tool({
    name: "reorient",
    description: `Record findings and decide next action.

- **continue**: Keep orienting, specify what to investigate next
- **answer**: You have enough information to answer the original question
- **plan**: You have enough information to create an execution plan`,
    schema: ReorientArgs,
    handler: async () => ok(null),
  })
)
