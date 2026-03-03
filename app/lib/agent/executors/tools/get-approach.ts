import type { Block, ToolResult } from "../../types"
import { GetApproachArgs, AssessTaskArgs, assessTaskTool } from "./get-approach.def"
import { registerSpecialHandler } from "../delegation"
import { getAllBlocks } from "../../block-store"
import { getFileRaw } from "~/lib/files"
import { PREFERENCES_FILE } from "~/lib/files/filename"
import { callLlm } from "../../stream"
import { toToolDefinition } from "../tool"
import { findCall } from "../../derived"

const APPROACHER_ENDPOINT = "/approacher"
const MAX_MESSAGES = 30

type ConversationBlock = { type: "user" | "text"; content: string }

const isConversation = (block: Block): block is ConversationBlock =>
  (block.type === "user" || block.type === "text") && "content" in block

const extractRecentConversation = (blocks: Block[], max: number): ConversationBlock[] =>
  blocks.filter(isConversation).slice(-max)

const formatConversation = (blocks: ConversationBlock[]): string =>
  blocks.map((b) => `${b.type === "user" ? "User" : "Assistant"}: ${b.content}`).join("\n\n")

const formatPreferences = (raw: string): string =>
  raw.trim() || "None set."

const buildUserMessage = (conversation: string, preferences: string, intent: string): string =>
  `<preferences>\n${formatPreferences(preferences)}\n</preferences>\n\n<conversation>\n${conversation}\n</conversation>\n\n<intent>\n${intent}\n</intent>\n\nWhat is the right approach for the user's latest request?`

const extractAssessment = (blocks: Block[]): string | null => {
  for (const block of blocks) {
    const call = findCall(block, "assess_task")
    if (!call) continue
    const parsed = AssessTaskArgs.safeParse(call.args)
    if (parsed.success) return parsed.data.assessment
  }
  return null
}

const getApproach = async (intent: string): Promise<string> => {
  const conversation = formatConversation(extractRecentConversation(getAllBlocks(), MAX_MESSAGES))
  const preferences = getFileRaw(PREFERENCES_FILE) ?? ""
  const message = buildUserMessage(conversation, preferences, intent)

  const blocks = await callLlm({
    endpoint: APPROACHER_ENDPOINT,
    messages: [{ type: "message", role: "user", content: message }],
    tools: [toToolDefinition(assessTaskTool)],
  })

  return extractAssessment(blocks) ?? ""
}

const executeGetApproach = async (call: { args: unknown }): Promise<ToolResult<unknown>> => {
  const parsed = GetApproachArgs.safeParse(call.args)
  if (!parsed.success) return { status: "error", output: `Invalid args: ${parsed.error.message}` }

  const assessment = await getApproach(parsed.data.intent)
  return { status: "ok", output: assessment }
}

registerSpecialHandler("get_approach", executeGetApproach)
