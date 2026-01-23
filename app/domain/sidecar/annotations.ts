import { findText } from "~/lib/text/find"
import type { SidecarAnnotation } from "./schema"

export type AnnotationInput = {
  text: string
  reason: string
  color?: string
  code?: string
}

type AppliedAnnotation = SidecarAnnotation & { matched: string }
type RejectedAnnotation = { text: string; error: string }

export type UpsertResult = {
  applied: AppliedAnnotation[]
  rejected: RejectedAnnotation[]
  annotations: SidecarAnnotation[]
}

export type DeleteResult = {
  annotations: SidecarAnnotation[]
}

const findExactText = (text: string, docContent: string): string | null => {
  const match = findText(text, docContent)
  return match ? match.text : null
}

const findExistingByText = (
  text: string,
  annotations: SidecarAnnotation[]
): SidecarAnnotation | null => annotations.find((a) => a.text === text) ?? null

const hasValue = (val: string | undefined): boolean =>
  val !== undefined && val !== ""

const hasColorOrCode = (input: AnnotationInput): boolean =>
  hasValue(input.color) || hasValue(input.code)

const hasBothColorAndCode = (input: AnnotationInput): boolean =>
  hasValue(input.color) && hasValue(input.code)

const toAnnotation = (input: AnnotationInput, matchedText: string): SidecarAnnotation =>
  hasValue(input.color)
    ? { text: matchedText, reason: input.reason, color: input.color as SidecarAnnotation["color"] }
    : { text: matchedText, reason: input.reason, code: input.code }

const processUpsertInput = (
  input: AnnotationInput,
  docContent: string
): { ok: true; annotation: AppliedAnnotation } | { ok: false; error: string } => {
  if (!hasColorOrCode(input)) {
    return { ok: false, error: "Either color or code must be set" }
  }
  if (hasBothColorAndCode(input)) {
    return { ok: false, error: "Cannot set both color and code" }
  }

  const matchedText = findExactText(input.text, docContent)
  if (!matchedText) {
    return { ok: false, error: "Text not found in document" }
  }

  const annotation = toAnnotation(input, matchedText)
  return { ok: true, annotation: { ...annotation, matched: matchedText } }
}

const removeByText = (annotations: SidecarAnnotation[], text: string): SidecarAnnotation[] =>
  annotations.filter((a) => a.text !== text)

const upsertIntoList = (
  annotations: SidecarAnnotation[],
  newAnnotation: SidecarAnnotation
): SidecarAnnotation[] => {
  const existing = findExistingByText(newAnnotation.text, annotations)
  if (existing) {
    return annotations.map((a) => (a.text === newAnnotation.text ? newAnnotation : a))
  }
  return [...annotations, newAnnotation]
}

export const prepareUpsertAnnotations = (
  docContent: string,
  existingAnnotations: SidecarAnnotation[],
  inputs: AnnotationInput[]
): UpsertResult => {
  const applied: AppliedAnnotation[] = []
  const rejected: RejectedAnnotation[] = []
  let annotations = [...existingAnnotations]

  for (const input of inputs) {
    const result = processUpsertInput(input, docContent)
    if (result.ok) {
      applied.push(result.annotation)
      const { matched: _, ...annotation } = result.annotation
      annotations = upsertIntoList(annotations, annotation)
    } else {
      rejected.push({ text: input.text, error: result.error })
    }
  }

  return { applied, rejected, annotations }
}

const annotationMatchesText = (annotation: SidecarAnnotation, text: string): boolean => {
  const match = findText(text, annotation.text)
  return match !== null && match.text === annotation.text
}

const matchesAnyText = (annotation: SidecarAnnotation, texts: string[]): boolean =>
  texts.some((text) => annotationMatchesText(annotation, text))

export const prepareDeleteAnnotations = (
  existingAnnotations: SidecarAnnotation[],
  texts: string[]
): DeleteResult => ({
  annotations: existingAnnotations.filter((a) => !matchesAnyText(a, texts)),
})
