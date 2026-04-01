import type { z } from "zod"
import type { ValidationError } from "./validate"

export interface IdPathConfig {
  path: string
  prefix: string
}

export interface ActorPathConfig {
  path: string
}

export interface BlockTypeConfig<T = unknown, C = unknown> {
  schema: z.ZodType<T>
  readonly: string[]
  immutable: Record<string, string>
  constraints: string[]
  renderer: "hidden" | "callout"
  singleton: boolean
  projected?: boolean
  allowedFiles?: string[]
  labelKey?: string
  idPaths?: IdPathConfig[]
  actorPaths?: ActorPathConfig[]
  fuzzyFields?: string[]
  patchSchema?: (schema: Record<string, unknown>) => Record<string, unknown>
  rowPath?: string
  validate?: (parsed: T, context: C) => ValidationError[]
}
