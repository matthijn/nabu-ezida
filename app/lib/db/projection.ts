import type { z } from "zod"

export interface ProjectionConfig {
  language: string
  tableName: string
  schema: z.ZodType
  singleton: boolean
  allowedFiles?: string[]
  expose?: boolean
  fileMapper?: (filename: string) => string
  hiddenColumns?: string[]
}
