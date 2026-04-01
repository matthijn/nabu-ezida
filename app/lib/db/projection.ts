import type { z } from "zod"

export interface ProjectionConfig {
  language: string
  tableName: string
  schema: z.ZodType
  singleton: boolean
  blockParser: (raw: string) => unknown[]
  allowedFiles?: string[]
  expose?: boolean
  fileMapper?: (filename: string) => string
  hiddenColumns?: string[]
}
