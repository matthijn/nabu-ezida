import type { ToolResult } from "../../types"
import { SubmitPlanArgs } from "./submit-plan.def"
import { registerSpecialHandler } from "../delegation"
import { getAllBlocks, setLoading, pushBlocks } from "../../block-store"
import { findLastUserContent } from "../../derived"
import { modeSystemBlocks } from "../modes"

const APPROVAL_PATTERN = /^(y(es)?|ok|go|proceed|sure|lgtm|looks?\s*good|approve[d]?|continue|do\s*it)/i

const isApproval = (text: string): boolean =>
  APPROVAL_PATTERN.test(text.trim())

const executeSubmitPlan = async (call: { args: unknown }): Promise<ToolResult<unknown>> => {
  const parsed = SubmitPlanArgs.safeParse(call.args)
  if (!parsed.success) return { status: "error", output: `Invalid args: ${parsed.error.message}` }

  const { waitForUser } = await import("../delegation")
  setLoading(false)
  await waitForUser()
  const answer = findLastUserContent(getAllBlocks())
  setLoading(true)

  if (isApproval(answer)) {
    pushBlocks(modeSystemBlocks("exec"))
    return { status: "ok", output: "Plan approved." }
  }

  return { status: "error", output: `Plan rejected: ${answer}` }
}

registerSpecialHandler("submit_plan", executeSubmitPlan)
