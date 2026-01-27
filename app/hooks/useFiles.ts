import { useSyncExternalStore } from "react"
import {
  getFiles,
  getCurrentFile,
  getFileRaw,
  getFileTags,
  getFileLineCount,
  getFileAnnotations,
  getCodebook,
  setCurrentFile,
  subscribe,
} from "~/lib/files"

export const useFiles = () => {
  const files = useSyncExternalStore(subscribe, getFiles)
  const currentFile = useSyncExternalStore(subscribe, getCurrentFile)
  const codebook = useSyncExternalStore(subscribe, getCodebook)

  return { files, currentFile, codebook, setCurrentFile, getFileTags, getFileLineCount, getFileAnnotations }
}

export const useCurrentFileContent = () => {
  const currentFile = useSyncExternalStore(subscribe, getCurrentFile)
  const content = useSyncExternalStore(
    subscribe,
    () => (currentFile ? getFileRaw(currentFile) : "")
  )

  return { currentFile, content }
}
