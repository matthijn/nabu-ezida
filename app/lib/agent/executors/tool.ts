import type { z } from "zod"
import type { Handler, HandlerResult, RawFiles, Operation } from "../types"

interface ToolDef<TSchema extends z.ZodType, TOutput> {
  name: string
  description: string
  schema: TSchema
  handler: (files: RawFiles, args: z.infer<TSchema>) => Promise<HandlerResult<TOutput>>
}

type Tool<TSchema extends z.ZodType, TOutput> = ToolDef<TSchema, TOutput> & {
  handle: Handler<TOutput>
}

export interface AnyTool {
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

export const formatZodError = (error: z.ZodError): string =>
  error.issues
    .map((i) => (i.path.length ? `${i.path.join(".")}: ${i.message}` : i.message))
    .join(", ")

// JSON Schema generation for LLM tool definitions
interface JsonSchemaProperty {
  type: string
  description?: string
  items?: JsonSchemaProperty
  properties?: Record<string, JsonSchemaProperty>
  required?: string[]
  enum?: string[]
  oneOf?: JsonSchemaProperty[]
  const?: unknown
}

export interface ToolDefinition {
  type: "function"
  name: string
  description: string
  strict?: true
  parameters: {
    type: "object"
    properties: Record<string, JsonSchemaProperty>
    required: string[]
    additionalProperties?: false
  }
}

const isObjectWithProperties = (s: Record<string, unknown>): boolean =>
  s.type === "object" && typeof s.properties === "object" && s.properties !== null

const isStrictCompatible = (schema: unknown): boolean => {
  if (typeof schema !== "object" || schema === null) return true
  const s = schema as Record<string, unknown>
  const keys = Object.keys(s).filter((k) => k !== "$schema")
  if (keys.length === 0 || (keys.length === 1 && keys[0] === "description")) return false

  if (s.type === "array" && s.items) return isStrictCompatible(s.items)

  if (s.type === "object" && typeof s.properties === "object" && s.properties !== null) {
    return Object.values(s.properties as Record<string, unknown>).every(isStrictCompatible)
  }

  for (const key of ["anyOf", "oneOf", "allOf"]) {
    if (Array.isArray(s[key])) return (s[key] as unknown[]).every(isStrictCompatible)
  }

  return true
}

export const toStrictSchema = (schema: unknown): unknown => {
  if (typeof schema !== "object" || schema === null) return schema
  const { $schema: _, ...s } = schema as Record<string, unknown>

  if (s.type === "array" && s.items) {
    return { ...s, items: toStrictSchema(s.items) }
  }

  if (isObjectWithProperties(s)) {
    const properties = s.properties as Record<string, unknown>
    const originalRequired = new Set(Array.isArray(s.required) ? (s.required as string[]) : [])
    const allKeys = Object.keys(properties)

    const wrapOptional = (key: string, prop: unknown): unknown =>
      originalRequired.has(key) ? prop : { anyOf: [prop, { type: "null" }] }

    const strictProperties = Object.fromEntries(
      allKeys.map((key) => [key, wrapOptional(key, toStrictSchema(properties[key]))])
    )

    return { ...s, properties: strictProperties, required: allKeys, additionalProperties: false }
  }

  if (Array.isArray(s.oneOf)) {
    const { oneOf: _, ...rest } = s
    return { ...rest, anyOf: (s.oneOf as unknown[]).map(toStrictSchema) }
  }

  for (const key of ["anyOf", "allOf"]) {
    if (Array.isArray(s[key])) {
      return { ...s, [key]: (s[key] as unknown[]).map(toStrictSchema) }
    }
  }

  return s
}

export const toToolDefinition = (t: AnyTool): ToolDefinition => {
  const jsonSchema = t.schema.toJSONSchema()
  const strict = isStrictCompatible(jsonSchema)
  const parameters = strict
    ? (toStrictSchema(jsonSchema) as ToolDefinition["parameters"])
    : {
        type: "object" as const,
        properties: {
          ...(((jsonSchema as Record<string, unknown>).properties as Record<
            string,
            JsonSchemaProperty
          >) ?? {}),
        },
        required: [...(((jsonSchema as Record<string, unknown>).required as string[]) ?? [])],
      }
  return {
    type: "function",
    name: t.name,
    description: t.description,
    ...(strict
      ? { strict: true, parameters: { ...parameters, additionalProperties: false as const } }
      : { parameters }),
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

export const getToolDefinitions = (): ToolDefinition[] => registry.map((t) => toToolDefinition(t))

export const getToolHandlers = (): Record<string, Handler> =>
  Object.fromEntries(registry.map((t) => [t.name, t.handle]))

export const toSchemaMap = (tools: AnyTool[]): Record<string, z.ZodType> =>
  Object.fromEntries(tools.map((t) => [t.name, t.schema]))

// Result helpers
export const ok = <T>(output: T, mutations: Operation[] = []): HandlerResult<T> => ({
  status: "ok",
  output,
  mutations,
})

export const partial = <T>(
  output: T,
  message: string,
  mutations: Operation[] = []
): HandlerResult<T> => ({
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

export const withHint = <T>(result: HandlerResult<T>, hint: string | null): HandlerResult<T> =>
  hint ? { ...result, hint } : result
