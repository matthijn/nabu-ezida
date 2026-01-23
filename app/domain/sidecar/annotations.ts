import type { SidecarAnnotation } from "./schema"

export type AnnotationInput = {
  text: string
  reason: string
  color?: string
  code?: string
}

export type UpsertResult = {
  applied: SidecarAnnotation[]
  rejected: { text: string; error: string }[]
  annotations: SidecarAnnotation[]
}

export type DeleteResult = {
  annotations: SidecarAnnotation[]
}

const hasValue = (val: string | undefined): boolean =>
  val !== undefined && val !== ""

const hasColorOrCode = (input: AnnotationInput): boolean =>
  hasValue(input.color) || hasValue(input.code)

const hasBothColorAndCode = (input: AnnotationInput): boolean =>
  hasValue(input.color) && hasValue(input.code)

const toAnnotation = (input: AnnotationInput): SidecarAnnotation =>
  hasValue(input.color)
    ? { text: input.text, reason: input.reason, color: input.color as SidecarAnnotation["color"] }
    : { text: input.text, reason: input.reason, code: input.code }

const upsertIntoList = (
  annotations: SidecarAnnotation[],
  newAnnotation: SidecarAnnotation
): SidecarAnnotation[] => {
  const exists = annotations.some((a) => a.text === newAnnotation.text)
  if (exists) {
    return annotations.map((a) => (a.text === newAnnotation.text ? newAnnotation : a))
  }
  return [...annotations, newAnnotation]
}

export const prepareUpsertAnnotations = (
  existingAnnotations: SidecarAnnotation[],
  inputs: AnnotationInput[]
): UpsertResult => {
  const applied: SidecarAnnotation[] = []
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

const annotationMatchesText = (annotation: SidecarAnnotation, text: string): boolean =>
  annotation.text.toLowerCase() === text.toLowerCase()

const matchesAnyText = (annotation: SidecarAnnotation, texts: string[]): boolean =>
  texts.some((text) => annotationMatchesText(annotation, text))

export const prepareDeleteAnnotations = (
  existingAnnotations: SidecarAnnotation[],
  texts: string[]
): DeleteResult => ({
  annotations: existingAnnotations.filter((a) => !matchesAnyText(a, texts)),
})
