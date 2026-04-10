import { useMemo, useSyncExternalStore } from "react"
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
import { buildIdentifierResolver } from "~/lib/files/selectors"

export const useFiles = () => {
  const files = useSyncExternalStore(subscribe, getFiles)
  const currentFile = useSyncExternalStore(subscribe, getCurrentFile)
  const codebook = useSyncExternalStore(subscribe, getCodebook)

  return useMemo(
    () => ({
      files,
      currentFile,
      codebook,
      setCurrentFile,
      getFileTags: (filename: string): string[] => getTags(files[filename] ?? ""),
      getFileDate: (filename: string): string | undefined => getFileDate(files[filename] ?? ""),
      getFileLineCount: (filename: string): number => getFileLineCount(filename),
      getFileAnnotations: (filename: string) => getAnnotations(files, files[filename] ?? ""),
      tagDefinitions: getTagDefinitions(files),
      resolveIds: buildIdentifierResolver(files),
    }),
    [files, currentFile, codebook]
  )
}
