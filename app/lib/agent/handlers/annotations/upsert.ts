import type { Handler } from "../../types"
import { prepareUpsertAnnotations, type AnnotationInput } from "~/domain/attributes"
import { getStoredAnnotations, saveAnnotations, toMdPath } from "./shared"

type UpsertArgs = {
  document_id: string
  annotations: AnnotationInput[]
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
  const existing = getStoredAnnotations(mdPath)
  const result = prepareUpsertAnnotations(existing, annotations)

  saveAnnotations(mdPath, result.annotations)

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
