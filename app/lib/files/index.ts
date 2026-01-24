export {
  getFiles,
  getCurrentFile,
  getFileRaw,
  getFileTags,
  getFileAnnotations,
  setFiles,
  setCurrentFile,
  updateFileRaw,
  deleteFile,
  subscribe,
  persistFiles,
  restoreFiles,
  type FileEntry,
} from "./store"

export {
  applyPatch,
  applyFilePatch,
  applyFilePatches,
  computeJsonDiff,
  type FileResult,
  type PatchOptions,
} from "./patch"
