import { getFileRaw, updateFileRaw } from "~/lib/files"
import { findSingletonBlock, parseBlockJson, replaceSingletonBlock } from "~/domain/blocks"
import type { SidecarAnnotation, DocumentMeta } from "~/domain/sidecar"

export const toMdPath = (documentId: string): string =>
  documentId.endsWith(".md") ? documentId : `${documentId}.md`

const getCurrentSidecar = (mdPath: string): DocumentMeta => {
  const raw = getFileRaw(mdPath)
  if (!raw) return {}
  const block = findSingletonBlock(raw, "json-attributes")
  if (!block) return {}
  return parseBlockJson<DocumentMeta>(block) ?? {}
}

export const saveSidecar = (
  mdPath: string,
  annotations: SidecarAnnotation[]
): void => {
  const markdown = getFileRaw(mdPath)
  if (!markdown) return

  const current = getCurrentSidecar(mdPath)
  const updated = { ...current, annotations }
  const sidecarJson = JSON.stringify(updated, null, 2)
  const newMarkdown = replaceSingletonBlock(markdown, "json-attributes", sidecarJson)
  updateFileRaw(mdPath, newMarkdown)
}
