import { useSyncExternalStore } from "react"
import {
  getFiles,
  getCurrentFile,
  getFileRaw,
  getFileTags,
  setCurrentFile,
  subscribe,
} from "~/lib/files"

export const useFiles = () => {
  const files = useSyncExternalStore(subscribe, getFiles)
  const currentFile = useSyncExternalStore(subscribe, getCurrentFile)

  return { files, currentFile, setCurrentFile, getFileTags }
}

export const useCurrentFileContent = () => {
  const currentFile = useSyncExternalStore(subscribe, getCurrentFile)
  const content = useSyncExternalStore(
    subscribe,
    () => (currentFile ? getFileRaw(currentFile) : "")
  )

  return { currentFile, content }
}
