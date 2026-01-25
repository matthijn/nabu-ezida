import { getFileRaw, getStoredAnnotations as getAnnotations, getFileTags, updateFileRaw } from "~/lib/files"
import { replaceSingletonBlock } from "~/domain/blocks"
import type { StoredAnnotation } from "~/domain/attributes"

export const toMdPath = (documentId: string): string =>
  documentId.endsWith(".md") ? documentId : `${documentId}.md`

export const getStoredAnnotations = (mdPath: string): StoredAnnotation[] =>
  getAnnotations(mdPath)

export const saveAnnotations = (
  mdPath: string,
  annotations: StoredAnnotation[]
): void => {
  const markdown = getFileRaw(mdPath)
  if (!markdown) return

  const tags = getFileTags(mdPath)
  const meta = tags.length > 0 ? { tags, annotations } : { annotations }
  const metaJson = JSON.stringify(meta, null, 2)
  const newMarkdown = replaceSingletonBlock(markdown, "json-attributes", metaJson)
  updateFileRaw(mdPath, newMarkdown)
}
