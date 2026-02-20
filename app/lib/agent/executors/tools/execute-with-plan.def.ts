import { z } from "zod"
import type { AnyTool } from "../tool"

export const executeWithPlanTool: AnyTool = {
  name: "execute_with_plan",
  description: "Start a planned execution. Use when the task has multiple steps, spans files, or benefits from upfront planning.",
  schema: z.object({}),
}
