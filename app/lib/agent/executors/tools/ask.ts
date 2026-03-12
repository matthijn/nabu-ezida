import type { ToolResult } from "../../types"
import { AskArgs } from "./ask.def"
import { registerSpecialHandler } from "../delegation"
import { getAllBlocks, setLoading } from "../../block-store"
import { findLastUserContent } from "../../derived"
import { agentWithChatHistory } from "../../agent-with-chat-history"

const SCOPE_CONTEXT: Record<"codebook" | "preferences", string> = {
  codebook: "Update the codebook only. Do not touch preferences.md.",
  preferences: "Update preferences.md only. Do not touch codebook files.",
}

const buildInstruction = (scope: "codebook" | "preferences", question: string, answer: string): string =>
  `The user was asked: ${question}\nThey answered: ${answer}\n\n${SCOPE_CONTEXT[scope]}`

const executeAsk = async (call: { args: unknown }): Promise<ToolResult<unknown>> => {
  const parsed = AskArgs.safeParse(call.args)
  if (!parsed.success) return { status: "error", output: `Invalid args: ${parsed.error.message}` }

  const { waitForUser } = await import("../delegation")
  setLoading(false)
  await waitForUser()
  const answer = findLastUserContent(getAllBlocks())
  setLoading(true)

  let writeResult = ""
  if (parsed.data.scope !== "local") {
    writeResult = await agentWithChatHistory(buildInstruction(parsed.data.scope, parsed.data.question, answer))
  }

  const output = writeResult ? `${answer}\n\nPersisted: ${writeResult}` : answer
  return { status: "ok", output }
}

registerSpecialHandler("ask", executeAsk)
