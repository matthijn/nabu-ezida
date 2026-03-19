import type { z } from "zod"

export interface ProjectionConfig {
  language: string
  tableName: string
  schema: z.ZodType
  singleton: boolean
  allowedFiles?: string[]
}
