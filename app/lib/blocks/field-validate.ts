import { z } from "zod"

export const emptyToUndefined = <T>(schema: z.ZodType<T>): z.ZodType<T | undefined> =>
  z.preprocess((v) => (v === "" ? undefined : v), schema.optional()) as z.ZodType<T | undefined>

export type SchemaIssue = {
  path: string
  message: string
  expected?: string
}

type SchemaSuccess<T> = {
  success: true
  data: T
}

type SchemaError = {
  success: false
  issues: SchemaIssue[]
  current: Record<string, unknown>
}

type SchemaResult<T> = SchemaSuccess<T> | SchemaError

export type FieldRejection<K extends string = string> =
  | { field: K; reason: "readonly"; hint: string }
  | { field: K; reason: "invalid"; issues: SchemaIssue[] }

type FieldValidationResult<T> = {
  accepted: Partial<T>
  rejected: FieldRejection<string & keyof T>[]
}

type FieldSchemas<T> = { [K in keyof T]: z.ZodType<T[K]> }
type ReadonlyHints<T> = Partial<Record<keyof T, string>>

type FieldValidateConfig<T> = {
  schema: z.ZodType<T>
  fieldSchemas: FieldSchemas<T>
  readonlyHints: ReadonlyHints<T>
}

const formatExpected = (issue: z.ZodIssue): string | undefined =>
  issue.code === "invalid_type" ? issue.expected : undefined

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

export const validateSchema = <T>(schema: z.ZodType<T>, data: unknown): SchemaResult<T> => {
  const result = schema.safeParse(data)

  if (result.success) {
    return { success: true, data: result.data }
  }

  const issues: SchemaIssue[] = result.error.issues.map((issue) => ({
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

export const getChangedFields = <T>(
  original: Partial<T>,
  patched: Partial<T>
): (string & keyof T)[] => {
  const allFields = new Set([
    ...Object.keys(original as Record<string, unknown>),
    ...Object.keys(patched as Record<string, unknown>),
  ])

  return [...allFields].filter(
    (field) => !deepEqual(
      (original as Record<string, unknown>)[field],
      (patched as Record<string, unknown>)[field]
    )
  ) as (string & keyof T)[]
}

export const validateField = <T, K extends string & keyof T>(
  fieldSchemas: FieldSchemas<T>,
  field: K,
  value: T[K]
): { ok: true } | { ok: false; issues: SchemaIssue[] } => {
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

type ValidatedField<K extends string> = {
  field: K
  value: unknown
  validation: { ok: true } | { ok: false; issues: SchemaIssue[] }
}

const validateFields = <T>(
  fieldSchemas: FieldSchemas<T>,
  fields: (string & keyof T)[],
  patched: Partial<T>
): ValidatedField<string & keyof T>[] =>
  fields.map((field) => ({
    field,
    value: patched[field],
    validation: validateField(fieldSchemas, field, patched[field] as T[typeof field]),
  }))

const isReadonlyField = <T>(readonlyHints: ReadonlyHints<T>, field: keyof T): boolean =>
  (field as string) in (readonlyHints as Record<string, unknown>)

const getReadonlyHint = <T>(readonlyHints: ReadonlyHints<T>, field: keyof T): string =>
  (readonlyHints[field] as string | undefined) ?? "This field is read-only"

const getReadonlyRejections = <T>(
  readonlyHints: ReadonlyHints<T>,
  fields: (string & keyof T)[]
): FieldRejection<string & keyof T>[] =>
  fields
    .filter((field) => isReadonlyField(readonlyHints, field))
    .map((field) => ({
      field,
      reason: "readonly" as const,
      hint: getReadonlyHint(readonlyHints, field),
    }))

const buildResult = <T>(
  original: Partial<T>,
  validated: ValidatedField<string & keyof T>[],
  readonlyRejections: FieldRejection<string & keyof T>[]
): FieldValidationResult<T> => {
  const accepted: Partial<T> = { ...original }
  const rejected: FieldRejection<string & keyof T>[] = [...readonlyRejections]

  for (const { field, value, validation } of validated) {
    if (!validation.ok) {
      rejected.push({ field, reason: "invalid", issues: validation.issues })
      continue
    }
    ;(accepted as Record<string, unknown>)[field] = value
  }

  return { accepted, rejected }
}

export const validateFieldChanges = <T>(
  config: FieldValidateConfig<T>,
  original: Partial<T>,
  patched: Partial<T>
): FieldValidationResult<T> => {
  const changedFields = getChangedFields(original, patched)
  const readonlyRejections = getReadonlyRejections(config.readonlyHints, changedFields)
  const mutableFields = changedFields.filter((f) => !isReadonlyField(config.readonlyHints, f))
  const validated = validateFields(config.fieldSchemas, mutableFields, patched)
  return buildResult(original, validated, readonlyRejections)
}

export const validateFieldChangesInternal = <T>(
  config: FieldValidateConfig<T>,
  original: Partial<T>,
  patched: Partial<T>
): FieldValidationResult<T> => {
  const changedFields = getChangedFields(original, patched)
  const validated = validateFields(config.fieldSchemas, changedFields, patched)
  return buildResult(original, validated, [])
}
