import type { ToolResult } from "../../types"
import { RecordDecisionArgs } from "./record-decision.def"
import { registerSpecialHandler } from "../delegation"
import { agentWithChatHistory } from "../../agent-with-chat-history"

const SCOPE_CONTEXT: Record<"codebook" | "preferences", string> = {
  codebook: "Update the codebook only. Do not touch preferences.md.",
  preferences: "Update preferences.md only. Do not touch codebook files.",
}

const buildInstruction = (scope: "codebook" | "preferences", summary: string): string =>
  `Decision reached with the user:\n${summary}\n\n${SCOPE_CONTEXT[scope]}`

const executeRecordDecision = async (call: { args: unknown }): Promise<ToolResult<unknown>> => {
  const parsed = RecordDecisionArgs.safeParse(call.args)
  if (!parsed.success) return { status: "error", output: `Invalid args: ${parsed.error.message}` }

  const writeResult = await agentWithChatHistory(
    buildInstruction(parsed.data.scope, parsed.data.summary)
  )
  return { status: "ok", output: writeResult || "No changes written." }
}

registerSpecialHandler("record_decision", executeRecordDecision)
