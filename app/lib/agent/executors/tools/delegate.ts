import { TaskArgs } from "./delegate.def"
import { registerDelegationHandler, startPhase, formatTaskContext } from "../delegation"

const executeDelegation = async (call: { args: unknown }) => {
  const parsed = TaskArgs.safeParse(call.args)
  if (!parsed.success) return { status: "error" as const, output: `Invalid args: ${parsed.error.message}` }

  const { who, ...fields } = parsed.data
  return startPhase(who, formatTaskContext(fields))
}

registerDelegationHandler("delegate", executeDelegation)
