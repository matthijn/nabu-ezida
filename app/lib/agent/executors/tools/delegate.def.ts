import { z } from "zod"
import type { AnyTool } from "../tool"
import { taskFields } from "./task-fields"

type ExpertEntry = { key: string; description: string }

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

export const TaskArgs = z.object({
  who: z.string(),
  ...taskFields,
})
