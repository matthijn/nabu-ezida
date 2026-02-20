import type { BlockOrigin, ToolResult } from "../../types"
import { AskArgs } from "./ask.def"
import { registerSpecialHandler } from "../delegation"
import { getBlocksForInstances } from "../../block-store"

const findLastUserContent = (origin: BlockOrigin): string => {
  const blocks = getBlocksForInstances([origin.instance])
  for (let i = blocks.length - 1; i >= 0; i--) {
    const block = blocks[i]
    if (block.type === "user") return block.content
  }
  return ""
}

const collectAnswers = async (
  questions: unknown[],
  origin: BlockOrigin,
  waitForUser: (origin: BlockOrigin) => Promise<void>,
): Promise<string[]> => {
  const answers: string[] = []
  for (let i = 0; i < questions.length; i++) {
    await waitForUser(origin)
    answers.push(findLastUserContent(origin))
  }
  return answers
}

const executeAsk = async (call: { args: unknown }, origin: BlockOrigin): Promise<ToolResult<unknown>> => {
  const parsed = AskArgs.safeParse(call.args)
  if (!parsed.success) return { status: "error", output: `Invalid args: ${parsed.error.message}` }

  const { waitForUser } = await import("../delegation")
  const answers = await collectAnswers(parsed.data.questions, origin, waitForUser)
  return { status: "ok", output: JSON.stringify(answers) }
}

registerSpecialHandler("ask", executeAsk)
