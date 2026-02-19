import type { Block, BlockOrigin, ToolResult } from "../../types"
import { createInstance } from "../../types"
import { ExecuteWithPlanArgs } from "./execute-with-plan.def"
import { registerDelegationHandler, startPhase, runAgent, formatTaskContext } from "../delegation"
import { agents } from "../agents"
import { pushBlocks, tagBlocks } from "../../block-store"

const synthesizeCreatePlan = (planData: Record<string, unknown>): Block[] => {
  const callId = `synth-${Date.now()}`
  return [
    { type: "tool_call", calls: [{ id: callId, name: "create_plan", args: planData }] },
    { type: "tool_result", callId, result: { status: "ok" } },
  ]
}

const executeWithPlan = async (call: { args: unknown }, origin?: BlockOrigin): Promise<ToolResult<unknown>> => {
  const parsed = ExecuteWithPlanArgs.safeParse(call.args)
  if (!parsed.success) return { status: "error", output: `Invalid args: ${parsed.error.message}` }

  if (!origin) return { status: "error", output: "execute_with_plan requires an origin" }

  const agentKey = origin.agent
  const planKey = `${agentKey}/plan`
  const execKey = `${agentKey}/exec`

  if (!agents[planKey] || !agents[execKey]) {
    return { status: "error", output: `Missing plan/exec agents for: ${agentKey}` }
  }

  const taskContext = formatTaskContext(parsed.data)

  const planResult = await startPhase(planKey, taskContext)
  if (planResult.status === "error") return planResult

  const planOutput = planResult.output as { outcome: string; artifacts?: string[] }
  const planData = JSON.parse(planOutput.outcome) as Record<string, unknown>

  const execOrigin: BlockOrigin = { agent: execKey, instance: createInstance(execKey) }
  const planBlocks = synthesizeCreatePlan(planData)
  pushBlocks(tagBlocks(execOrigin, [
    { type: "system", content: taskContext },
    ...planBlocks,
  ]))
  return runAgent(execKey, execOrigin, { interactive: agents[execKey].interactive })
}

registerDelegationHandler("execute_with_plan", executeWithPlan)
