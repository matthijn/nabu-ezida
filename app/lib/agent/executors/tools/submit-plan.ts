import type { ToolResult } from "../../types"
import { SubmitPlanArgs } from "./submit-plan.def"
import { registerSpecialHandler } from "../delegation"
import { pushBlocks } from "../../block-store"
import { modeSystemBlocks } from "../modes"

const executeSubmitPlan = async (call: { args: unknown }): Promise<ToolResult<unknown>> => {
  const parsed = SubmitPlanArgs.safeParse(call.args)
  if (!parsed.success) return { status: "error", output: `Invalid args: ${parsed.error.message}` }

  pushBlocks(modeSystemBlocks("exec"))
  return { status: "ok", output: "Plan submitted." }
}

registerSpecialHandler("submit_plan", executeSubmitPlan)
