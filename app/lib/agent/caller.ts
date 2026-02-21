import { z } from "zod"
import type { Block, ToolCall, ToolResultBlock } from "./types"
import type { ParseCallbacks, ResponseFormat } from "./stream"
import { callLlm, blocksToMessages, toResponseFormat, extractText } from "./stream"
import { pushBlocks } from "./block-store"
import { executeTool, type ToolExecutor } from "./turn"
import type { ToolDefinition } from "./executors/tool"
import type { BlockSchemaDefinition } from "~/domain/blocks/registry"
import { isToolCallBlock } from "./derived"

export type CallerConfig = {
  endpoint: string
  tools?: ToolDefinition[]
  blockSchemas?: BlockSchemaDefinition[]
  execute?: ToolExecutor
  responseFormat?: ResponseFormat
  callbacks?: ParseCallbacks
  readBlocks: () => Block[]
}

export type Caller = (signal?: AbortSignal) => Promise<Block[]>

export type TypedCaller<T> = (signal?: AbortSignal) => Promise<{ result: T } | { error: string }>

const executeToolCalls = async (
  calls: ToolCall[],
  execute: ToolExecutor,
): Promise<ToolResultBlock[]> => {
  const results: ToolResultBlock[] = []
  for (const call of calls) {
    results.push(await executeTool(call, execute))
  }
  return results
}

export const buildCaller = (config: CallerConfig): Caller =>
  async (signal) => {
    const history = config.readBlocks()
    const blocks = await callLlm({
      endpoint: config.endpoint,
      messages: blocksToMessages(history),
      tools: config.tools,
      blockSchemas: config.blockSchemas,
      responseFormat: config.responseFormat,
      callbacks: config.callbacks,
      signal,
    })

    pushBlocks(blocks)

    const toolResults: Block[] = []
    for (const block of blocks) {
      if (isToolCallBlock(block) && config.execute) {
        const results = await executeToolCalls(block.calls, config.execute)
        pushBlocks(results)
        toolResults.push(...results)
      }
    }

    return [...blocks, ...toolResults]
  }

export const withSchema = <T>(caller: Caller, schema: z.ZodType<T>): TypedCaller<T> =>
  async (signal) => {
    const newBlocks = await caller(signal)
    const text = extractText(newBlocks)
    try {
      const parsed = JSON.parse(text)
      const result = schema.safeParse(parsed)
      if (!result.success) return { error: `Schema validation failed: ${result.error.message}` }
      return { result: result.data }
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) }
    }
  }

export const buildTypedCaller = <T>(config: CallerConfig, schema: z.ZodType<T>): TypedCaller<T> =>
  withSchema(
    buildCaller({ ...config, responseFormat: config.responseFormat ?? toResponseFormat(schema) }),
    schema
  )
