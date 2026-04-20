export {
  type FileStore,
  getFiles,
  getFilesStripped,
  getFile,
  getFileRaw,
  getCurrentFile,
  getFileLineCount,
  getCodebook,
  setFiles,
  setCurrentFile,
  updateFileRaw,
  deleteFile,
  renameFile,
  subscribe,
  getProjectId,
  setProjectId,
  setPersistEnabled,
  setPendingRefsSuppressed,
  resolvePendingRefsInBulk,
  withoutPersist,
  schedulePersist,
} from "./store"

export { getTags } from "~/domain/data-blocks/attributes/tags/selectors"
export { getFileDate } from "~/domain/data-blocks/attributes/date/selectors"
export { getDocumentSubject } from "~/domain/data-blocks/attributes/topics/selectors"
export { getAnnotations } from "~/domain/data-blocks/attributes/annotations/selectors"
export { getCodeTitle } from "~/domain/data-blocks/callout/codes/selectors"
export { getTagDefinitions } from "~/domain/data-blocks/settings/tags/selectors"

export { applyFilePatch, finalizeContent } from "~/lib/patch/apply"

export { formatGeneratedIds } from "~/lib/data-blocks/uuid"
