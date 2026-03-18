import type { z } from "zod"
import type { Block } from "./blocks"
import { toStrictSchema } from "../executors/tool"

type InputItem =
  | { type: "message"; role: "system" | "user" | "assistant"; content: string }
  | { type: "function_call"; call_id: string; status: string; name: string; arguments: string }
  | { type: "function_call_output"; call_id: string; status: string; output: string }
  | {
      type: "reasoning"
      id: string
      summary: { type: "summary_text"; text: string }[]
      encrypted_content: string
    }

export interface ResponseFormat {
  type: "json_schema"
  json_schema: {
    name: string
    schema: unknown
    strict: boolean
  }
}

export const toResponseFormat = <T extends z.ZodType>(schema: T): ResponseFormat => ({
  type: "json_schema",
  json_schema: {
    name: "response",
    schema: toStrictSchema(schema.toJSONSchema()),
    strict: true,
  },
})

export const extractText = (blocks: Block[]): string => {
  const textBlock = blocks.find((b) => b.type === "text")
  return textBlock?.type === "text" ? textBlock.content : ""
}

const blockToInputItem = (block: Block): InputItem | InputItem[] => {
  if (block.type === "system") {
    return { type: "message", role: "system", content: block.content }
  }
  if (block.type === "text") {
    return { type: "message", role: "assistant", content: block.content }
  }
  if (block.type === "user") {
    return { type: "message", role: "user", content: block.content }
  }
  if (block.type === "tool_call") {
    return block.calls.map((c) => ({
      type: "function_call" as const,
      call_id: c.id,
      status: "completed",
      name: c.name,
      arguments: JSON.stringify(c.args),
    }))
  }
  if (block.type === "tool_result") {
    return {
      type: "function_call_output" as const,
      call_id: block.callId,
      status: "completed",
      output: JSON.stringify(block.result),
    }
  }
  if (block.type === "reasoning") {
    if (block.id && block.encryptedContent) {
      return {
        type: "reasoning",
        id: block.id,
        summary: [{ type: "summary_text" as const, text: block.content }],
        encrypted_content: block.encryptedContent,
      }
    }
    return []
  }
  if (block.type === "empty_nudge") {
    return []
  }
  if (block.type === "debug_pause") {
    return []
  }
  return []
}

export const blocksToMessages = (blocks: Block[]): InputItem[] => blocks.flatMap(blockToInputItem)

export type { InputItem }
