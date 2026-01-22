import type { Project } from "./types"
import type { Document } from "../document"

export const selectDocumentsWithTag = (project: Project, tag: string): Document[] =>
  Object.values(project.documents).filter(doc => tag in doc.tags)
