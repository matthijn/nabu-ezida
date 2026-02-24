import type { ToolResult } from "../../types"
import { AskArgs } from "./ask.def"
import { registerSpecialHandler } from "../delegation"
import { getAllBlocks, setLoading } from "../../block-store"

const findLastUserContent = (): string => {
  const blocks = getAllBlocks()
  for (let i = blocks.length - 1; i >= 0; i--) {
    const block = blocks[i]
    if (block.type === "user") return block.content
  }
  return ""
}

const executeAsk = async (call: { args: unknown }): Promise<ToolResult<unknown>> => {
  const parsed = AskArgs.safeParse(call.args)
  if (!parsed.success) return { status: "error", output: `Invalid args: ${parsed.error.message}` }

  const { waitForUser } = await import("../delegation")
  setLoading(false)
  await waitForUser()
  const answer = findLastUserContent()
  setLoading(true)
  return { status: "ok", output: answer }
}

registerSpecialHandler("ask", executeAsk)
