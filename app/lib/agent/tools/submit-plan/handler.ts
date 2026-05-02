import type { ToolResult } from "../../types"
import { SubmitPlanArgs } from "./def"
import { registerSpecialHandler } from "../../executors/delegation"
import { activatePlan } from "../../executors/modes"

const executeSubmitPlan = async (call: { args: unknown }): Promise<ToolResult<unknown>> => {
  const parsed = SubmitPlanArgs.safeParse(call.args)
  if (!parsed.success) return { status: "error", output: `Invalid args: ${parsed.error.message}` }

  const { task, steps, decisions } = parsed.data
  activatePlan(task, steps, decisions ?? [])
  return { status: "ok", output: "Plan submitted." }
}

registerSpecialHandler("submit_plan", executeSubmitPlan)
