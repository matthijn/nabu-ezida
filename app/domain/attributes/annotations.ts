import type { StoredAnnotation } from "./schema"
import { mdToPlainText } from "~/lib/text/markdown"

export type AnnotationInput = {
  text: string
  reason: string
  color?: string
  code?: string
}

export type UpsertResult = {
  applied: StoredAnnotation[]
  rejected: { text: string; error: string }[]
  annotations: StoredAnnotation[]
}

export type DeleteResult = {
  annotations: StoredAnnotation[]
}

const hasValue = (val: string | undefined): boolean =>
  val !== undefined && val !== ""

const hasColorOrCode = (input: AnnotationInput): boolean =>
  hasValue(input.color) || hasValue(input.code)

const hasBothColorAndCode = (input: AnnotationInput): boolean =>
  hasValue(input.color) && hasValue(input.code)

const toAnnotation = (input: AnnotationInput): StoredAnnotation => {
  const text = mdToPlainText(input.text)
  return hasValue(input.color)
    ? { text, reason: input.reason, color: input.color as StoredAnnotation["color"] }
    : { text, reason: input.reason, code: input.code }
}

const upsertIntoList = (
  annotations: StoredAnnotation[],
  newAnnotation: StoredAnnotation
): StoredAnnotation[] => {
  const exists = annotations.some((a) => a.text === newAnnotation.text)
  if (exists) {
    return annotations.map((a) => (a.text === newAnnotation.text ? newAnnotation : a))
  }
  return [...annotations, newAnnotation]
}

export const prepareUpsertAnnotations = (
  existingAnnotations: StoredAnnotation[],
  inputs: AnnotationInput[]
): UpsertResult => {
  const applied: StoredAnnotation[] = []
  const rejected: { text: string; error: string }[] = []
  let annotations = [...existingAnnotations]

  for (const input of inputs) {
    if (!hasColorOrCode(input)) {
      rejected.push({ text: input.text, error: "Either color or code must be set" })
      continue
    }
    if (hasBothColorAndCode(input)) {
      rejected.push({ text: input.text, error: "Cannot set both color and code" })
      continue
    }

    const annotation = toAnnotation(input)
    applied.push(annotation)
    annotations = upsertIntoList(annotations, annotation)
  }

  return { applied, rejected, annotations }
}

const annotationMatchesText = (annotation: StoredAnnotation, text: string): boolean =>
  annotation.text.toLowerCase() === text.toLowerCase()

const matchesAnyText = (annotation: StoredAnnotation, texts: string[]): boolean =>
  texts.some((text) => annotationMatchesText(annotation, text))

export const prepareDeleteAnnotations = (
  existingAnnotations: StoredAnnotation[],
  texts: string[]
): DeleteResult => ({
  annotations: existingAnnotations.filter((a) => !matchesAnyText(a, texts)),
})
