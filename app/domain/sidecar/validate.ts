import { z } from "zod"
import { DocumentMeta, fieldSchemas, READONLY_FIELD_HINTS, type DocumentMetaField } from "./schema"

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

export type FieldRejection =
  | { field: DocumentMetaField; reason: "readonly"; hint: string }
  | { field: DocumentMetaField; reason: "invalid"; issues: ValidationIssue[] }

export type FieldValidationResult = {
  accepted: Partial<DocumentMeta>
  rejected: FieldRejection[]
}

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

const deepEqual = (a: unknown, b: unknown): boolean =>
  JSON.stringify(a) === JSON.stringify(b)

export const getChangedFields = (
  original: Partial<DocumentMeta>,
  patched: Partial<DocumentMeta>
): DocumentMetaField[] => {
  const allFields = new Set([
    ...Object.keys(original),
    ...Object.keys(patched),
  ]) as Set<DocumentMetaField>

  return [...allFields].filter(
    (field) => !deepEqual(original[field], patched[field])
  )
}

export const validateField = <K extends DocumentMetaField>(
  field: K,
  value: DocumentMeta[K]
): { ok: true } | { ok: false; issues: ValidationIssue[] } => {
  const schema = fieldSchemas[field]
  const result = schema.safeParse(value)

  if (result.success) {
    return { ok: true }
  }

  return {
    ok: false,
    issues: result.error.issues.map((issue) => ({
      path: [field, ...issue.path].join("."),
      message: issue.message,
      expected: formatExpected(issue),
    })),
  }
}

const isReadonlyField = (field: DocumentMetaField): boolean =>
  field in READONLY_FIELD_HINTS

const getReadonlyHint = (field: DocumentMetaField): string =>
  READONLY_FIELD_HINTS[field] ?? "This field is read-only"

const getReadonlyRejections = (fields: DocumentMetaField[]): FieldRejection[] =>
  fields.filter(isReadonlyField).map((field) => ({
    field,
    reason: "readonly" as const,
    hint: getReadonlyHint(field),
  }))

type ValidatedField = {
  field: DocumentMetaField
  value: unknown
  validation: { ok: true } | { ok: false; issues: ValidationIssue[] }
}

const validateFields = (
  fields: DocumentMetaField[],
  patched: Partial<DocumentMeta>
): ValidatedField[] =>
  fields.map((field) => ({
    field,
    value: patched[field],
    validation: validateField(field, patched[field]),
  }))

const buildResult = (
  original: Partial<DocumentMeta>,
  validated: ValidatedField[],
  readonlyRejections: FieldRejection[]
): FieldValidationResult => {
  const accepted: Partial<DocumentMeta> = { ...original }
  const rejected: FieldRejection[] = [...readonlyRejections]

  for (const { field, value, validation } of validated) {
    if (!validation.ok) {
      rejected.push({ field, reason: "invalid", issues: validation.issues })
      continue
    }
    ;(accepted as Record<string, unknown>)[field] = value
  }

  return { accepted, rejected }
}

export const validateFieldChanges = (
  original: Partial<DocumentMeta>,
  patched: Partial<DocumentMeta>
): FieldValidationResult => {
  const changedFields = getChangedFields(original, patched)
  const readonlyRejections = getReadonlyRejections(changedFields)
  const mutableFields = changedFields.filter((f) => !isReadonlyField(f))
  const validated = validateFields(mutableFields, patched)
  return buildResult(original, validated, readonlyRejections)
}

export const validateFieldChangesInternal = (
  original: Partial<DocumentMeta>,
  patched: Partial<DocumentMeta>
): FieldValidationResult => {
  const changedFields = getChangedFields(original, patched)
  const validated = validateFields(changedFields, patched)
  return buildResult(original, validated, [])
}
