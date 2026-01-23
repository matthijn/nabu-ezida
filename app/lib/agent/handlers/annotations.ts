import type { Handler } from "../types"
import { getFileRaw, getFileAnnotations, updateFileParsed } from "~/lib/files"
import {
  prepareUpsertAnnotations,
  prepareDeleteAnnotations,
  type AnnotationInput,
  type SidecarAnnotation,
} from "~/domain/sidecar"

type UpsertArgs = {
  document_id: string
  annotations: AnnotationInput[]
}

type DeleteArgs = {
  document_id: string
  texts: string[]
}

type AnnotationResult =
  | { status: "completed"; output: string }
  | { status: "failed"; output: string }

const toMdPath = (documentId: string): string =>
  documentId.endsWith(".md") ? documentId : `${documentId}.md`

const toSidecarPath = (mdPath: string): string =>
  mdPath.replace(/\.md$/, ".json")

const getCurrentSidecar = (mdPath: string): Record<string, unknown> => {
  const sidecarPath = toSidecarPath(mdPath)
  const raw = getFileRaw(sidecarPath)
  if (!raw) return {}
  try {
    return JSON.parse(raw) as Record<string, unknown>
  } catch {
    return {}
  }
}

const saveSidecar = (
  mdPath: string,
  annotations: SidecarAnnotation[]
): void => {
  const sidecarPath = toSidecarPath(mdPath)
  const current = getCurrentSidecar(mdPath)
  const updated = { ...current, annotations }
  const raw = JSON.stringify(updated, null, 2)
  updateFileParsed(sidecarPath, raw, updated)
}

export const upsertAnnotationsTool: Handler = async (_, args) => {
  const { document_id, annotations } = args as UpsertArgs

  if (!document_id) {
    return { status: "failed", output: "document_id is required" }
  }
  if (!annotations || !Array.isArray(annotations)) {
    return { status: "failed", output: "annotations array is required" }
  }

  const mdPath = toMdPath(document_id)
  const existing = getFileAnnotations(mdPath) ?? []
  const result = prepareUpsertAnnotations(existing, annotations)

  saveSidecar(mdPath, result.annotations)

  const appliedCount = result.applied.length
  const rejectedCount = result.rejected.length

  if (rejectedCount === 0) {
    return { status: "completed", output: `Added ${appliedCount} annotation(s)` }
  }

  const rejectedText = result.rejected
    .map((r) => `"${r.text}": ${r.error}`)
    .join("; ")

  return {
    status: "completed",
    output: `Added ${appliedCount} annotation(s). Rejected: ${rejectedText}`,
  }
}

export const deleteAnnotationsTool: Handler = async (_, args) => {
  const { document_id, texts } = args as DeleteArgs

  if (!document_id) {
    return { status: "failed", output: "document_id is required" }
  }
  if (!texts || !Array.isArray(texts)) {
    return { status: "failed", output: "texts array is required" }
  }

  const mdPath = toMdPath(document_id)
  const existing = getFileAnnotations(mdPath) ?? []
  const beforeCount = existing.length

  const result = prepareDeleteAnnotations(existing, texts)

  saveSidecar(mdPath, result.annotations)

  const deletedCount = beforeCount - result.annotations.length

  return {
    status: "completed",
    output: deletedCount > 0
      ? `Removed ${deletedCount} annotation(s)`
      : "No annotations removed",
  }
}
