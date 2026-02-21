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

const collectAnswers = async (
  questions: unknown[],
  waitForUser: () => Promise<void>,
): Promise<string[]> => {
  const answers: string[] = []
  for (let i = 0; i < questions.length; i++) {
    await waitForUser()
    answers.push(findLastUserContent())
  }
  return answers
}

const executeAsk = async (call: { args: unknown }): Promise<ToolResult<unknown>> => {
  const parsed = AskArgs.safeParse(call.args)
  if (!parsed.success) return { status: "error", output: `Invalid args: ${parsed.error.message}` }

  const { waitForUser } = await import("../delegation")
  setLoading(false)
  const answers = await collectAnswers(parsed.data.questions, waitForUser)
  setLoading(true)
  return { status: "ok", output: JSON.stringify(answers) }
}

registerSpecialHandler("ask", executeAsk)
