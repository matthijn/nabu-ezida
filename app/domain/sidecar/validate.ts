import { z } from "zod"
import { DocumentMeta } from "./schema"

export type ValidationIssue = {
  path: string
  message: string
  expected?: string
}

export type ValidationSuccess<T> = {
  success: true
  data: T
}

export type ValidationError = {
  success: false
  issues: ValidationIssue[]
  current: Record<string, unknown>
}

export type ValidationResult<T> = ValidationSuccess<T> | ValidationError

const formatExpected = (issue: z.ZodIssue): string | undefined => {
  if (issue.code === "invalid_type") {
    return issue.expected
  }
  return undefined
}

const extractAffectedFields = (
  issues: z.ZodIssue[],
  data: unknown
): Record<string, unknown> => {
  const current: Record<string, unknown> = {}
  const obj = data as Record<string, unknown> | null

  for (const issue of issues) {
    const rootPath = issue.path[0]
    if (typeof rootPath === "string" && obj && rootPath in obj) {
      current[rootPath] = obj[rootPath]
    }
  }

  return current
}

export const validateDocumentMeta = (data: unknown): ValidationResult<DocumentMeta> => {
  const result = DocumentMeta.safeParse(data)

  if (result.success) {
    return { success: true, data: result.data }
  }

  const issues: ValidationIssue[] = result.error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
    expected: formatExpected(issue),
  }))

  return {
    success: false,
    issues,
    current: extractAffectedFields(result.error.issues, data),
  }
}
