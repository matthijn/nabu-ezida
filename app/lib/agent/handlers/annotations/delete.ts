import type { Handler } from "../../types"
import { getFileAnnotations } from "~/lib/files"
import { prepareDeleteAnnotations } from "~/domain/sidecar"
import { saveSidecar, toMdPath } from "./shared"

type DeleteArgs = {
  document_id: string
  texts: string[]
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
