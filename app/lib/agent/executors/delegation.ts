import type { ToolCall, ToolResult, Block, BlockOrigin } from "../types"
import type { ToolExecutor } from "../turn"
import { pushBlocks, tagBlocks, getBlocksForInstances, subscribeBlocks, setActiveOrigin } from "../block-store"
import { getFiles } from "~/lib/files/store"
import { derive, lastPlan, guardCompleteStep, guardCompleteSubstep } from "../derived"
import { deriveMode, buildModeResult, modeSystemBlocks, hasUserSincePlanEntry } from "./modes"
import type { ModeName } from "./modes"

export type SpecialHandler = (call: { args: unknown }, origin: BlockOrigin) => Promise<ToolResult<unknown>>

const specialHandlers = new Map<string, SpecialHandler>()

export const registerSpecialHandler = (name: string, handler: SpecialHandler): void => {
  specialHandlers.set(name, handler)
}

const countInstanceBlocks = (instance: string): number =>
  getBlocksForInstances([instance]).length

export const waitForUser = (origin: BlockOrigin, signal?: AbortSignal): Promise<void> => {
  setActiveOrigin(origin)
  const before = countInstanceBlocks(origin.instance)
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) { reject(signal.reason); return }

    const cleanup = () => {
      unsub()
      if (signal) signal.removeEventListener("abort", onAbort)
    }

    const unsub = subscribeBlocks(() => {
      if (countInstanceBlocks(origin.instance) > before) {
        cleanup()
        resolve()
      }
    })

    const onAbort = () => {
      cleanup()
      reject(signal!.reason)
    }

    if (signal) signal.addEventListener("abort", onAbort, { once: true })
  })
}

const handleExecuteWithPlan = (origin: BlockOrigin): ToolResult<unknown> => {
  pushBlocks(tagBlocks(origin, modeSystemBlocks("plan")))
  return { status: "ok", output: buildModeResult("plan") }
}

const guardCreatePlan = (origin: BlockOrigin): ToolResult<unknown> | null => {
  const blocks = getBlocksForInstances([origin.instance])
  if (hasUserSincePlanEntry(blocks)) return null
  return { status: "error", output: "Present your approach to the user first. The plan structure depends on their involvement preferences." }
}

const handleCreatePlan = (origin: BlockOrigin): ToolResult<unknown> => {
  const guardResult = guardCreatePlan(origin)
  if (guardResult) return guardResult
  pushBlocks(tagBlocks(origin, modeSystemBlocks("exec")))
  return { status: "ok", output: buildModeResult("exec") }
}

const handleCancelInMode = (call: ToolCall, mode: ModeName, origin: BlockOrigin): ToolResult<unknown> => {
  if (mode === "chat") return { status: "error", output: "Nothing to cancel." }
  pushBlocks(tagBlocks(origin, modeSystemBlocks("chat")))
  const reason = (call.args as { reason?: string }).reason ?? "Cancelled"
  return { status: "ok", output: `Cancelled: ${reason}. ${buildModeResult("chat")}` }
}

const isStepGuarded = (name: string): boolean =>
  name === "complete_step" || name === "complete_substep"

const guardMap = { complete_step: guardCompleteStep, complete_substep: guardCompleteSubstep } as const

const checkStepGuard = (call: ToolCall, origin: BlockOrigin): ToolResult<unknown> | null => {
  const guardFn = guardMap[call.name as keyof typeof guardMap]
  if (!guardFn) return null

  const blocks = getBlocksForInstances([origin.instance])
  const d = derive(blocks, getFiles())
  const plan = lastPlan(d.plans)
  if (!plan) return null

  const guard = guardFn(plan)
  if (guard.allowed) return null
  return { status: "error", output: guard.reason }
}

const isModeTransition = (name: string): boolean =>
  name === "execute_with_plan" || name === "create_plan" || name === "cancel"

export const withModeAwareness = (base: ToolExecutor, origin: BlockOrigin): ToolExecutor =>
  async (call) => {
    if (isModeTransition(call.name)) {
      const blocks = getBlocksForInstances([origin.instance])
      const mode = deriveMode(blocks)

      if (call.name === "execute_with_plan") return handleExecuteWithPlan(origin)
      if (call.name === "create_plan") return handleCreatePlan(origin)
      if (call.name === "cancel") return handleCancelInMode(call, mode, origin)
    }

    const handler = specialHandlers.get(call.name)
    if (handler) return handler(call, origin)

    if (isStepGuarded(call.name)) {
      const guardResult = checkStepGuard(call, origin)
      if (guardResult) return guardResult
    }

    return base(call)
  }
