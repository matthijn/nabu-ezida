import { sendCommands } from "~/lib/api/client"
import { documentCommands } from "~/domain/api/commands/document"
import type { Annotation } from "~/domain/document"
import type { Handler } from "../types"

export const addAnnotations: Handler = async (_, args) => {
  const documentId = args.document_id as string
  const annotations = args.annotations as Annotation[]
  const cmds = annotations.map(annotation =>
    documentCommands.add_annotation({ document_id: documentId, annotation })
  )
  return sendCommands(cmds)
}
