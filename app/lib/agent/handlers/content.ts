import { send, sendCommands } from "~/lib/api/client"
import { documentCommands } from "~/domain/api/commands/document"
import { selectBlockIdsForDocument } from "~/domain/project"
import type { Block, Annotation } from "~/domain/document"
import type { Handler } from "../types"

export const replaceContent: Handler = async (deps, args) => {
  if (!deps.project) return { error: "Project not available" }
  const documentId = args.document_id as string
  const content = args.content as Block[]
  const blockIds = selectBlockIdsForDocument(deps.project, documentId)

  if (blockIds.length > 0) {
    await send(documentCommands.delete_blocks({ document_id: documentId, block_ids: blockIds }))
  }
  if (content.length > 0) {
    await send(documentCommands.insert_blocks({ document_id: documentId, position: "head", blocks: content }))
  }
  return { success: true, replaced: { deleted: blockIds.length, inserted: content.length } }
}

export const addAnnotations: Handler = async (_, args) => {
  const documentId = args.document_id as string
  const annotations = args.annotations as Annotation[]
  const cmds = annotations.map(annotation =>
    documentCommands.add_annotation({ document_id: documentId, annotation })
  )
  return sendCommands(cmds)
}
