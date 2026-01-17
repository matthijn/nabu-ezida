import { send } from "~/lib/api/client"
import { documentCommands } from "~/domain/api/commands/document"
import type { Tag } from "~/domain/document"
import type { Handler } from "../types"

const selectDocument = (project: { documents: Record<string, { tags: Record<string, Tag> }> }, documentId: string) =>
  project.documents[documentId]

const filterTagsToAdd = (current: Record<string, Tag>, requested: string[]): string[] =>
  requested.filter(tag => !(tag in current))

const filterTagsToRemove = (current: Record<string, Tag>, requested: string[]): string[] =>
  requested.filter(tag => tag in current)

export const addDocumentTags: Handler = async (deps, args) => {
  if (!deps.project) return { error: "Project not available" }
  const doc = selectDocument(deps.project, args.document_id as string)
  if (!doc) return { error: "Document not found" }

  const tags = filterTagsToAdd(doc.tags, args.tags as string[])
  if (tags.length === 0) {
    console.debug("[addDocumentTags] No change", { documentId: args.document_id, existingTags: Object.keys(doc.tags), requestedTags: args.tags })
    return { success: true }
  }

  return send(documentCommands.add_document_tags({ document_id: args.document_id as string, tags }))
}

export const removeDocumentTags: Handler = async (deps, args) => {
  if (!deps.project) return { error: "Project not available" }
  const doc = selectDocument(deps.project, args.document_id as string)
  if (!doc) return { error: "Document not found" }

  const tags = filterTagsToRemove(doc.tags, args.tags as string[])
  if (tags.length === 0) return { success: true }

  return send(documentCommands.remove_document_tags({ document_id: args.document_id as string, tags }))
}
