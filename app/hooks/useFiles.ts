import { useSyncExternalStore } from "react"
import {
  getFiles,
  getCurrentFile,
  getFileRaw,
  getFileLineCount,
  getCodebook,
  setCurrentFile,
  subscribe,
  getTags,
  getAnnotations,
} from "~/lib/files"

export const useFiles = () => {
  const files = useSyncExternalStore(subscribe, getFiles)
  const currentFile = useSyncExternalStore(subscribe, getCurrentFile)
  const codebook = useSyncExternalStore(subscribe, getCodebook)

  const getFileTags = (filename: string): string[] => getTags(files[filename] ?? "")
  const getFileLineCountFn = (filename: string): number => getFileLineCount(filename)
  const getFileAnnotations = (filename: string) => getAnnotations(files, files[filename] ?? "")

  return { files, currentFile, codebook, setCurrentFile, getFileTags, getFileLineCount: getFileLineCountFn, getFileAnnotations }
}

export const useCurrentFileContent = () => {
  const currentFile = useSyncExternalStore(subscribe, getCurrentFile)
  const content = useSyncExternalStore(
    subscribe,
    () => (currentFile ? getFileRaw(currentFile) : "")
  )

  return { currentFile, content }
}
