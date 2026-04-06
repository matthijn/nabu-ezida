import { useSyncExternalStore } from "react"
import {
  getFiles,
  getCurrentFile,
  getFileLineCount,
  getCodebook,
  setCurrentFile,
  subscribe,
  getTags,
  getFileDate,
  getAnnotations,
  getTagDefinitions,
} from "~/lib/files"
import type { TagDefinition } from "~/domain/data-blocks/settings/schema"
import { buildIdentifierResolver } from "~/lib/files/selectors"

export const useFiles = () => {
  const files = useSyncExternalStore(subscribe, getFiles)
  const currentFile = useSyncExternalStore(subscribe, getCurrentFile)
  const codebook = useSyncExternalStore(subscribe, getCodebook)

  const getFileTags = (filename: string): string[] => getTags(files[filename] ?? "")
  const getFileDateFn = (filename: string): string | undefined => getFileDate(files[filename] ?? "")
  const getFileLineCountFn = (filename: string): number => getFileLineCount(filename)
  const getFileAnnotations = (filename: string) => getAnnotations(files, files[filename] ?? "")
  const tagDefinitions: TagDefinition[] = getTagDefinitions(files)
  const resolveIds = buildIdentifierResolver(files)

  return {
    files,
    currentFile,
    codebook,
    setCurrentFile,
    getFileTags,
    getFileDate: getFileDateFn,
    getFileLineCount: getFileLineCountFn,
    getFileAnnotations,
    tagDefinitions,
    resolveIds,
  }
}
