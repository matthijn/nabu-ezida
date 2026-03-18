import type { ToolResult } from "../../types"
import { SubmitPlanArgs } from "./def"
import { registerSpecialHandler } from "../../executors/delegation"
import { pushBlocks } from "../../client"
import { modeSystemBlocks } from "../../executors/modes"

const executeSubmitPlan = async (call: { args: unknown }): Promise<ToolResult<unknown>> => {
  const parsed = SubmitPlanArgs.safeParse(call.args)
  if (!parsed.success) return { status: "error", output: `Invalid args: ${parsed.error.message}` }

  pushBlocks(modeSystemBlocks("exec"))
  return { status: "ok", output: "Plan submitted." }
}

registerSpecialHandler("submit_plan", executeSubmitPlan)
