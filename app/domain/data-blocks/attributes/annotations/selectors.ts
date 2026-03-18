import type { Annotation as StoredAnnotation } from "../schema"
import { findCodeById } from "~/domain/data-blocks/callout/codes/selectors"
import { getAttributes } from "../selectors"

export type Annotation = Omit<StoredAnnotation, "color"> & { color: string }

export const getStoredAnnotations = (raw: string): StoredAnnotation[] =>
  getAttributes(raw)?.annotations ?? []

export const getAnnotationCount = (raw: string): number => getStoredAnnotations(raw).length

const DEFAULT_ANNOTATION_COLOR = "gray"

export const resolveAnnotationColor = (
  files: Record<string, string>,
  annotation: StoredAnnotation
): string => {
  if (annotation.color) return annotation.color
  if (annotation.code)
    return findCodeById(files, annotation.code)?.color ?? DEFAULT_ANNOTATION_COLOR
  return DEFAULT_ANNOTATION_COLOR
}

const resolveAnnotation = (
  files: Record<string, string>,
  stored: StoredAnnotation
): Annotation => ({
  id: stored.id,
  text: stored.text,
  color: resolveAnnotationColor(files, stored),
  reason: stored.reason,
  code: stored.code,
  review: stored.review,
})

export const getAnnotations = (files: Record<string, string>, raw: string): Annotation[] =>
  getStoredAnnotations(raw).map((a) => resolveAnnotation(files, a))

export const findAnnotationById = (
  files: Record<string, string>,
  id: string
): StoredAnnotation | undefined =>
  Object.values(files)
    .flatMap(getStoredAnnotations)
    .find((a) => a.id === id)

export const findDocumentForAnnotation = (
  files: Record<string, string>,
  id: string
): string | undefined =>
  Object.entries(files).find(([_, raw]) => getStoredAnnotations(raw).some((a) => a.id === id))?.[0]
