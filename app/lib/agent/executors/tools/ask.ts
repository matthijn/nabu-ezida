import type { ToolResult } from "../../types"
import { AskArgs } from "./ask.def"
import { registerSpecialHandler } from "../delegation"
import { getAllBlocks, setLoading } from "../../block-store"
import { findLastUserContent } from "../../derived"
import { runScopeAgent, type AskScope } from "./ask-scope-agent"

const isNonLocal = (scope: AskScope): boolean => scope !== "local"

const executeAsk = async (call: { args: unknown }): Promise<ToolResult<unknown>> => {
  const parsed = AskArgs.safeParse(call.args)
  if (!parsed.success) return { status: "error", output: `Invalid args: ${parsed.error.message}` }

  const { waitForUser } = await import("../delegation")
  setLoading(false)
  await waitForUser()
  const answer = findLastUserContent(getAllBlocks())
  setLoading(true)

  if (isNonLocal(parsed.data.scope)) {
    await runScopeAgent(parsed.data.scope, parsed.data.question, answer)
  }

  return { status: "ok", output: answer }
}

registerSpecialHandler("ask", executeAsk)
