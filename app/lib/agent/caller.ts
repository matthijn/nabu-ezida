import { z } from "zod"
import type { Block, BlockOrigin, ToolCall, ToolResultBlock } from "./types"
import type { ParseCallbacks, ResponseFormat } from "./stream"
import { callLlm, blocksToMessages, toResponseFormat, extractText } from "./stream"
import { pushBlocks, tagBlocks } from "./block-store"
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

export const buildCaller = (origin: BlockOrigin, config: CallerConfig): Caller =>
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

    const resultBlocks: Block[] = []
    for (const block of blocks) {
      resultBlocks.push(block)
      if (isToolCallBlock(block) && config.execute) {
        const toolResults = await executeToolCalls(block.calls, config.execute)
        resultBlocks.push(...toolResults)
      }
    }

    pushBlocks(tagBlocks(origin, resultBlocks))
    return resultBlocks
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

export const buildTypedCaller = <T>(origin: BlockOrigin, config: CallerConfig, schema: z.ZodType<T>): TypedCaller<T> =>
  withSchema(
    buildCaller(origin, { ...config, responseFormat: config.responseFormat ?? toResponseFormat(schema) }),
    schema
  )
