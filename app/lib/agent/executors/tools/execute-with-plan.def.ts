import { z } from "zod"
import type { AnyTool } from "../tool"
import { taskFields } from "./task-fields"

export const executeWithPlanTool: AnyTool = {
  name: "execute_with_plan",
  description: "Delegate complex work into a planned, structured execution with fresh context. Use when the task has multiple steps, spans files, or benefits from upfront planning. The work is taken over entirely — you receive the result when done.",
  schema: z.object(taskFields),
}

export const ExecuteWithPlanArgs = z.object(taskFields)
