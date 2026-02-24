import { z } from "zod"
import type { Block, ToolCall, ToolResultBlock } from "./types"
import type { ParseCallbacks, ResponseFormat } from "./stream"
import { callLlm, blocksToMessages, toResponseFormat, extractText } from "./stream"
import { pushBlocks } from "./block-store"
import { executeTool, type ToolExecutor } from "./turn"
import { formatZodError, type ToolDefinition } from "./executors/tool"
import type { BlockSchemaDefinition } from "~/domain/blocks/registry"
import { isToolCallBlock } from "./derived"

export type CallerConfig = {
  endpoint: string
  tools?: ToolDefinition[]
  toolSchemas?: Record<string, z.ZodType>
  blockSchemas?: BlockSchemaDefinition[]
  execute?: ToolExecutor
  responseFormat?: ResponseFormat
  callbacks?: ParseCallbacks
  readBlocks: () => Block[]
  transformBlocks?: (blocks: Block[]) => Block[]
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

const validateCallArgs = (call: ToolCall, schemas: Record<string, z.ZodType>): string | null => {
  const schema = schemas[call.name]
  if (!schema) return null
  const parsed = schema.safeParse(call.args)
  return parsed.success ? null : formatZodError(parsed.error)
}

const toValidationError = (call: ToolCall, message: string): ToolResultBlock => ({
  type: "tool_result",
  callId: call.id,
  toolName: call.name,
  result: { status: "error", output: `Invalid arguments: ${message}` },
})

type PartitionedCalls = { valid: ToolCall[]; errors: ToolResultBlock[] }

const partitionCalls = (calls: ToolCall[], schemas: Record<string, z.ZodType>): PartitionedCalls => {
  const tagged = calls.map((call) => ({ call, error: validateCallArgs(call, schemas) }))
  return {
    valid: tagged.filter((t) => t.error === null).map((t) => t.call),
    errors: tagged
      .filter((t): t is { call: ToolCall; error: string } => t.error !== null)
      .map(({ call, error }) => toValidationError(call, error)),
  }
}

type ValidatedBlocks = { committed: Block[]; validCalls: ToolCall[] }

const validateAndInterleave = (blocks: Block[], schemas: Record<string, z.ZodType>): ValidatedBlocks => {
  const partitions = blocks.map((block) =>
    isToolCallBlock(block)
      ? { block, ...partitionCalls(block.calls, schemas) }
      : { block, valid: [] as ToolCall[], errors: [] as ToolResultBlock[] }
  )
  return {
    committed: partitions.flatMap(({ block, errors }) => [block, ...errors]),
    validCalls: partitions.flatMap(({ valid }) => valid),
  }
}

export const buildCaller = (config: CallerConfig): Caller =>
  async (signal) => {
    const history = config.readBlocks()
    const raw = await callLlm({
      endpoint: config.endpoint,
      messages: blocksToMessages(history),
      tools: config.tools,
      blockSchemas: config.blockSchemas,
      responseFormat: config.responseFormat,
      callbacks: config.callbacks,
      signal,
    })

    const blocks = config.transformBlocks ? config.transformBlocks(raw) : raw
    const schemas = config.toolSchemas ?? {}
    const { committed, validCalls } = validateAndInterleave(blocks, schemas)
    pushBlocks(committed)

    const validationErrors = committed.filter((b): b is ToolResultBlock => b.type === "tool_result")

    if (validCalls.length > 0 && config.execute) {
      const results = await executeToolCalls(validCalls, config.execute)
      pushBlocks(results)
      return [...blocks, ...validationErrors, ...results]
    }

    return [...blocks, ...validationErrors]
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
