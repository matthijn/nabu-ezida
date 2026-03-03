import { z } from "zod"
import type { AnyTool } from "../tool"

export const GetApproachArgs = z.object({
  intent: z.string().describe("The user's current intent as you understand it — what they want done and why."),
})

export const AssessTaskArgs = z.object({
  assessment: z.string().describe("Your advisory assessment of the task — approach, concerns, and observations specific to this conversation."),
})

export const assessTaskTool: AnyTool = {
  name: "assess_task",
  description: "Submit your assessment of the task.",
  schema: AssessTaskArgs,
}

export const getApproachTool: AnyTool = {
  name: "get_approach",
  description: "Get an advisory approach assessment before starting work. Dispatches to a specialist that reviews the conversation, user preferences, and your understanding of the intent. Use before triage when the task involves analytical judgment.",
  schema: GetApproachArgs,
}
