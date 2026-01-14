import type { Project } from "./types"
import type { Document, Block, Annotation } from "../document"
import { getCodingPayload } from "../plugins/coding"

export type ProjectRow = {
  id: string
  name: string
  description: string
  pinned: boolean
  updated_at: string
  healthy: boolean
  version: number
}

export type DocumentRow = {
  id: string
  project_id: string
  name: string
  description: string
  title: string | null
  time: string | null
  updated_at: string
  original: string
  pinned: boolean
  healthy: boolean
  version: number
}

export type BlockRow = {
  id: string
  document_id: string
  parent_id: string | null
  position: number
  type: string
  props: string | null
  content: string | null
}

export type AnnotationRow = {
  id: string
  document_id: string
  text: string
  actor: string
  color: string
  reason: string | null
  code_id: string | null
  confidence: string | null
}

export const selectProjectRow = (project: Project): ProjectRow => ({
  id: project.id,
  name: project.name,
  description: project.description,
  pinned: project.pinned,
  updated_at: project.updated_at,
  healthy: project.healthy,
  version: project.version,
})

export const selectDocumentRows = (project: Project): DocumentRow[] =>
  Object.values(project.documents).map(doc => ({
    id: doc.id,
    project_id: doc.project_id,
    name: doc.name,
    description: doc.description,
    title: doc.title ?? null,
    time: doc.time ?? null,
    updated_at: doc.updated_at,
    original: doc.original,
    pinned: doc.pinned,
    healthy: doc.healthy,
    version: doc.version,
  }))

const flattenBlocks = (
  documentId: string,
  blocks: Block[],
  parentId: string | null
): BlockRow[] =>
  blocks.flatMap((block, index) => {
    const row: BlockRow = {
      id: block.id!,
      document_id: documentId,
      parent_id: parentId,
      position: index,
      type: block.type,
      props: block.props ? JSON.stringify(block.props) : null,
      content: block.content ? JSON.stringify(block.content) : null,
    }
    const childRows = block.children
      ? flattenBlocks(documentId, block.children, block.id!)
      : []
    return [row, ...childRows]
  })

export const selectBlockRows = (project: Project): BlockRow[] =>
  Object.values(project.documents).flatMap(doc =>
    flattenBlocks(doc.id, doc.content, null)
  )

export const selectAnnotationRows = (project: Project): AnnotationRow[] =>
  Object.values(project.documents).flatMap(doc =>
    Object.values(doc.annotations).map(ann => {
      const payload = getCodingPayload(ann)
      return {
        id: ann.id,
        document_id: doc.id,
        text: ann.text,
        actor: ann.actor,
        color: ann.color,
        reason: ann.reason ?? null,
        code_id: payload?.code_id ?? null,
        confidence: payload?.confidence ?? null,
      }
    })
  )

export const selectBlockIdsForDocument = (project: Project, documentId: string): string[] => {
  const doc = project.documents[documentId]
  if (!doc) return []
  return flattenBlocks(documentId, doc.content, null).map(row => row.id)
}
