import { z } from "zod"
import type { Block, ToolCall, ToolResultBlock } from "./types"
import type { ParseCallbacks, ResponseFormat } from "./stream"
import { callLlm, blocksToMessages, toResponseFormat, extractText } from "./stream"
import { startObservation, updateObservationStreaming, updateObservationReasoning, completeObservation } from "./observation-store"
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
}

export type Caller = (history: Block[], signal?: AbortSignal) => Promise<Block[]>

export type TypedCaller<T> = (history: Block[], signal?: AbortSignal) => Promise<{ result: T } | { error: string }>

const mergeCallbacks = (a: ParseCallbacks, b: ParseCallbacks): ParseCallbacks => ({
  onChunk: (text) => { a.onChunk?.(text); b.onChunk?.(text) },
  onToolArgsChunk: (text) => { a.onToolArgsChunk?.(text); b.onToolArgsChunk?.(text) },
  onReasoningChunk: (text) => { a.onReasoningChunk?.(text); b.onReasoningChunk?.(text) },
  onBlock: (block) => { a.onBlock?.(block); b.onBlock?.(block) },
  onToolName: (name) => { a.onToolName?.(name); b.onToolName?.(name) },
  onToolCall: (call) => { a.onToolCall?.(call); b.onToolCall?.(call) },
})

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

export const buildCaller = (name: string, config: CallerConfig): Caller =>
  async (history, signal) => {
    const entryId = startObservation(name, config.endpoint, history)

    const observationCallbacks: ParseCallbacks = {
      onChunk: (chunk) => updateObservationStreaming(entryId, chunk),
      onReasoningChunk: (chunk) => updateObservationReasoning(entryId, chunk),
    }

    const merged = mergeCallbacks(
      observationCallbacks,
      config.callbacks ?? {}
    )

    const blocks = await callLlm({
      endpoint: config.endpoint,
      messages: blocksToMessages(history),
      tools: config.tools,
      blockSchemas: config.blockSchemas,
      responseFormat: config.responseFormat,
      callbacks: merged,
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

    completeObservation(entryId, resultBlocks)
    return [...history, ...resultBlocks]
  }

export const withSchema = <T>(caller: Caller, schema: z.ZodType<T>): TypedCaller<T> =>
  async (history, signal) => {
    const newHistory = await caller(history, signal)
    const responseBlocks = newHistory.slice(history.length)
    const text = extractText(responseBlocks)
    try {
      const parsed = JSON.parse(text)
      const result = schema.safeParse(parsed)
      if (!result.success) return { error: `Schema validation failed: ${result.error.message}` }
      return { result: result.data }
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) }
    }
  }

export const buildTypedCaller = <T>(name: string, config: CallerConfig, schema: z.ZodType<T>): TypedCaller<T> =>
  withSchema(
    buildCaller(name, { ...config, responseFormat: config.responseFormat ?? toResponseFormat(schema) }),
    schema
  )
