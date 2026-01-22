import { useSyncExternalStore } from "react"
import {
  getFiles,
  getCurrentFile,
  getFileContent,
  setCurrentFile,
  subscribe,
} from "~/lib/files"

export const useFiles = () => {
  const files = useSyncExternalStore(subscribe, getFiles)
  const currentFile = useSyncExternalStore(subscribe, getCurrentFile)

  return { files, currentFile, setCurrentFile }
}

export const useCurrentFileContent = () => {
  const currentFile = useSyncExternalStore(subscribe, getCurrentFile)
  const content = useSyncExternalStore(
    subscribe,
    () => (currentFile ? getFileContent(currentFile) : "")
  )

  return { currentFile, content }
}
