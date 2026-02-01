import { getCodebook as computeCodebook, type Codebook } from "./selectors"
import { stripPending, markPending, resolvePending, getAllDefinitions, findPending, findDefinitionIds } from "./pending"

type Files = Record<string, string>
type Listener = () => void

let files: Files = {}
let currentFile: string | null = null
const listeners = new Set<Listener>()

// Memoized selectors - cache invalidated on files change
let cachedFiles: Files | null = null
let cachedCodebook: Codebook | undefined

const notify = (): void => listeners.forEach((l) => l())

export const getFiles = (): Files => files

export const getFilesStripped = (): Files =>
  Object.fromEntries(Object.entries(files).map(([k, v]) => [k, stripPending(v)]))

export const getCodebook = (): Codebook | undefined => {
  if (cachedFiles !== files) {
    cachedFiles = files
    cachedCodebook = computeCodebook(files)
  }
  return cachedCodebook
}

export const getFile = (filename: string): string | undefined => files[filename]

export const getFileRaw = (filename: string): string => files[filename] ?? ""

export const getCurrentFile = (): string | null => currentFile

export const getFileLineCount = (filename: string): number =>
  getFileRaw(filename).split("\n").length

export const setFiles = (newFiles: Record<string, string>): void => {
  console.debug(`[store] setFiles: ${Object.keys(newFiles).length} files`, Object.keys(newFiles))
  files = newFiles
  notify()
}

export const setCurrentFile = (filename: string | null): void => {
  currentFile = filename
  notify()
}

export const updateFileRaw = (filename: string, raw: string): void => {
  const isNew = !(filename in files)
  console.debug(`[store] updateFileRaw: ${isNew ? "create" : "update"} "${filename}" (${raw.length} chars)`)

  const definitions = getAllDefinitions(files)
  const marked = markPending(raw, definitions)
  const pendingInNew = findPending(marked)
  if (pendingInNew.length > 0) {
    console.debug(`[store] marked ${pendingInNew.length} pending refs in "${filename}"`)
  }

  const newDefinitions = findDefinitionIds(raw)
  let updatedFiles: Files = { ...files, [filename]: marked }
  let resolvedCount = 0

  for (const defId of newDefinitions) {
    for (const [path, content] of Object.entries(updatedFiles)) {
      if (path === filename) continue
      const pending = findPending(content)
      if (pending.includes(defId)) {
        const resolved = resolvePending(content, defId)
        updatedFiles = { ...updatedFiles, [path]: resolved }
        resolvedCount++
      }
    }
  }

  if (resolvedCount > 0) {
    console.debug(`[store] resolved ${resolvedCount} pending refs`)
  }

  files = updatedFiles
  notify()
}

export const deleteFile = (filename: string): void => {
  console.debug(`[store] deleteFile: "${filename}"`)
  const { [filename]: _, ...rest } = files
  files = rest
  if (currentFile === filename) {
    currentFile = null
  }
  notify()
}

export const renameFile = (oldName: string, newName: string): void => {
  console.debug(`[store] renameFile: "${oldName}" -> "${newName}"`)
  const content = files[oldName]
  if (content === undefined) return

  const { [oldName]: _, ...rest } = files
  files = { ...rest, [newName]: content }

  if (currentFile === oldName) {
    currentFile = newName
  }
  notify()
}

export const subscribe = (listener: Listener): (() => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
