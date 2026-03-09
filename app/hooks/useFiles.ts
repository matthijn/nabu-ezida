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
  getTagDefinitions,
} from "~/lib/files"
import type { TagDefinition } from "~/domain/settings"

export const useFiles = () => {
  const files = useSyncExternalStore(subscribe, getFiles)
  const currentFile = useSyncExternalStore(subscribe, getCurrentFile)
  const codebook = useSyncExternalStore(subscribe, getCodebook)

  const getFileTags = (filename: string): string[] => getTags(files[filename] ?? "")
  const getFileLineCountFn = (filename: string): number => getFileLineCount(filename)
  const getFileAnnotations = (filename: string) => getAnnotations(files, files[filename] ?? "")
  const tagDefinitions: TagDefinition[] = getTagDefinitions(files)

  return { files, currentFile, codebook, setCurrentFile, getFileTags, getFileLineCount: getFileLineCountFn, getFileAnnotations, tagDefinitions }
}

export const useCurrentFileContent = () => {
  const currentFile = useSyncExternalStore(subscribe, getCurrentFile)
  const content = useSyncExternalStore(
    subscribe,
    () => (currentFile ? getFileRaw(currentFile) : "")
  )

  return { currentFile, content }
}
