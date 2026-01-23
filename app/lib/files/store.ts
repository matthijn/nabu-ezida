import type { DocumentMeta } from "~/domain/sidecar"

export type FileEntry =
  | { raw: string }
  | { raw: string; parsed: DocumentMeta }

type Files = Record<string, FileEntry>
type Listener = () => void

const STORAGE_KEY = "nabu:files"

let files: Files = {}
let currentFile: string | null = null
const listeners = new Set<Listener>()

const notify = (): void => {
  listeners.forEach(l => l())
}

export const getFiles = (): Files => files

export const getCurrentFile = (): string | null => currentFile

export const getFileRaw = (filename: string): string =>
  files[filename]?.raw ?? ""

const toSidecarPath = (filename: string): string =>
  filename.replace(/\.md$/, ".json")

export const getFileTags = (filename: string): string[] => {
  const sidecarPath = toSidecarPath(filename)
  const entry = files[sidecarPath]
  if (!entry || !("parsed" in entry)) return []
  return entry.parsed.tags ?? []
}

export const getFileAnnotations = (filename: string): DocumentMeta["annotations"] => {
  const sidecarPath = toSidecarPath(filename)
  const entry = files[sidecarPath]
  if (!entry || !("parsed" in entry)) return []
  return entry.parsed.annotations ?? []
}

export const setFiles = (newFiles: Files): void => {
  files = newFiles
  notify()
}

export const setCurrentFile = (filename: string | null): void => {
  currentFile = filename
  notify()
}

export const updateFileRaw = (filename: string, raw: string): void => {
  files = { ...files, [filename]: { raw } }
  notify()
}

export const updateFileParsed = (filename: string, raw: string, parsed: DocumentMeta): void => {
  files = { ...files, [filename]: { raw, parsed } }
  notify()
}

export const deleteFile = (filename: string): void => {
  const { [filename]: _, ...rest } = files
  files = rest
  if (currentFile === filename) {
    currentFile = null
  }
  notify()
}

export const subscribe = (listener: Listener): (() => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export const persistFiles = (): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(files))
  } catch {
    // localStorage full or unavailable
  }
}

export const restoreFiles = (): void => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      files = JSON.parse(stored) as Files
      notify()
    }
  } catch {
    // parse error or localStorage unavailable
  }
}
