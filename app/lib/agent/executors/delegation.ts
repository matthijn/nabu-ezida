import type { ToolCall, ToolResult, Block } from "../types"
import type { ToolExecutor } from "../turn"
import { pushBlocks, getAllBlocks, subscribeBlocks } from "../block-store"
import { getFiles } from "~/lib/files/store"
import { derive, lastPlan, guardCompleteStep, guardCompleteSubstep } from "../derived"
import { deriveMode, buildModeResult, modeSystemBlocks } from "./modes"
import type { ModeName } from "./modes"

export type SpecialHandler = (call: { args: unknown }) => Promise<ToolResult<unknown>>

const specialHandlers = new Map<string, SpecialHandler>()

export const registerSpecialHandler = (name: string, handler: SpecialHandler): void => {
  specialHandlers.set(name, handler)
}

export const waitForUser = (signal?: AbortSignal): Promise<void> => {
  const before = getAllBlocks().length
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) { reject(signal.reason); return }

    const cleanup = () => {
      unsub()
      if (signal) signal.removeEventListener("abort", onAbort)
    }

    const unsub = subscribeBlocks(() => {
      if (getAllBlocks().length > before) {
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

const handleExecuteWithPlan = (): ToolResult<unknown> => {
  pushBlocks(modeSystemBlocks("plan"))
  return { status: "ok", output: buildModeResult("plan") }
}

const handleCreatePlan = (): ToolResult<unknown> => {
  pushBlocks(modeSystemBlocks("exec"))
  return { status: "ok", output: buildModeResult("exec") }
}

const handleCancelInMode = (call: ToolCall, mode: ModeName): ToolResult<unknown> => {
  if (mode === "chat") return { status: "error", output: "Nothing to cancel." }
  pushBlocks(modeSystemBlocks("chat"))
  const reason = (call.args as { reason?: string }).reason ?? "Cancelled"
  return { status: "ok", output: `Cancelled: ${reason}. ${buildModeResult("chat")}` }
}

const isStepGuarded = (name: string): boolean =>
  name === "complete_step" || name === "complete_substep"

const guardMap = { complete_step: guardCompleteStep, complete_substep: guardCompleteSubstep } as const

const checkStepGuard = (call: ToolCall): ToolResult<unknown> | null => {
  const guardFn = guardMap[call.name as keyof typeof guardMap]
  if (!guardFn) return null

  const blocks = getAllBlocks()
  const d = derive(blocks, getFiles())
  const plan = lastPlan(d.plans)
  if (!plan) return null

  const guard = guardFn(plan)
  if (guard.allowed) return null
  return { status: "error", output: guard.reason }
}

const isModeTransition = (name: string): boolean =>
  name === "execute_with_plan" || name === "create_plan" || name === "cancel"

export const withModeAwareness = (base: ToolExecutor): ToolExecutor =>
  async (call) => {
    if (isModeTransition(call.name)) {
      const blocks = getAllBlocks()
      const mode = deriveMode(blocks)

      if (call.name === "execute_with_plan") return handleExecuteWithPlan()
      if (call.name === "create_plan") return handleCreatePlan()
      if (call.name === "cancel") return handleCancelInMode(call, mode)
    }

    const handler = specialHandlers.get(call.name)
    if (handler) return handler(call)

    if (isStepGuarded(call.name)) {
      const guardResult = checkStepGuard(call)
      if (guardResult) return guardResult
    }

    return base(call)
  }
