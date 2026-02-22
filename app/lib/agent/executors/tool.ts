import { z } from "zod"
import type { Handler, HandlerResult, RawFiles, Operation } from "../types"

type ToolDef<TSchema extends z.ZodType, TOutput> = {
  name: string
  description: string
  schema: TSchema
  handler: (files: RawFiles, args: z.infer<TSchema>) => Promise<HandlerResult<TOutput>>
}

type Tool<TSchema extends z.ZodType, TOutput> = ToolDef<TSchema, TOutput> & {
  handle: Handler<TOutput>
}

export type AnyTool = {
  name: string
  description: string
  schema: z.ZodType
}

export const tool = <TSchema extends z.ZodType, TOutput>(
  def: ToolDef<TSchema, TOutput>
): Tool<TSchema, TOutput> => {
  const handle: Handler<TOutput> = async (files, args) => {
    const parsed = def.schema.safeParse(args)
    if (!parsed.success) {
      return {
        status: "error",
        output: formatZodError(parsed.error),
        mutations: [],
      }
    }
    return def.handler(files, parsed.data)
  }

  return { ...def, handle }
}

const formatZodError = (error: z.ZodError): string =>
  error.issues.map((i) => (i.path.length ? `${i.path.join(".")}: ${i.message}` : i.message)).join(", ")

// JSON Schema generation for LLM tool definitions
type JsonSchemaProperty = {
  type: string
  description?: string
  items?: JsonSchemaProperty
  properties?: Record<string, JsonSchemaProperty>
  required?: string[]
  enum?: string[]
  oneOf?: JsonSchemaProperty[]
  const?: unknown
}

export type ToolDefinition = {
  type: "function"
  name: string
  description: string
  parameters: {
    type: "object"
    properties: Record<string, JsonSchemaProperty>
    required: string[]
  }
}

export const toToolDefinition = (t: AnyTool): ToolDefinition => {
  const jsonSchema = t.schema.toJSONSchema() as {
    type?: string
    properties?: Record<string, JsonSchemaProperty>
    required?: string[]
  }

  return {
    type: "function",
    name: t.name,
    description: t.description,
    parameters: {
      type: "object",
      properties: { ...(jsonSchema.properties ?? {}) },
      required: [...(jsonSchema.required ?? [])],
    },
  }
}

// Registry for all tools
const registry: Tool<z.ZodType, unknown>[] = []

export const registerTool = <TSchema extends z.ZodType, TOutput>(
  t: Tool<TSchema, TOutput>
): Tool<TSchema, TOutput> => {
  registry.push(t as Tool<z.ZodType, unknown>)
  return t
}

export const getToolDefinitions = (): ToolDefinition[] =>
  registry.map((t) => toToolDefinition(t))

export const getToolHandlers = (): Record<string, Handler> =>
  Object.fromEntries(registry.map((t) => [t.name, t.handle]))

// Result helpers
export const ok = <T>(output: T, mutations: Operation[] = []): HandlerResult<T> => ({
  status: "ok",
  output,
  mutations,
})

export const partial = <T>(output: T, message: string, mutations: Operation[] = []): HandlerResult<T> => ({
  status: "partial",
  output,
  message,
  mutations,
})

export const err = (output: string): HandlerResult<never> => ({
  status: "error",
  output,
  mutations: [],
})
