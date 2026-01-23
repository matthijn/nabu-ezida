import { getFileRaw, updateFileParsed } from "~/lib/files"
import type { SidecarAnnotation } from "~/domain/sidecar"

export const toMdPath = (documentId: string): string =>
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

export const saveSidecar = (
  mdPath: string,
  annotations: SidecarAnnotation[]
): void => {
  const sidecarPath = toSidecarPath(mdPath)
  const current = getCurrentSidecar(mdPath)
  const updated = { ...current, annotations }
  const raw = JSON.stringify(updated, null, 2)
  updateFileParsed(sidecarPath, raw, updated)
}
