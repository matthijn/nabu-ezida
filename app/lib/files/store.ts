import { getCodebook as computeCodebook, type Codebook } from "./selectors"
import { stripPendingRefs, markPendingRefs, resolvePendingRef, getAllDefinitions, findPendingRefs, findDefinitionIds } from "./pending-refs"
import { debounce, createScopedDebounce } from "~/lib/utils"
import { sendCommand } from "~/lib/sync/commands"

type Files = Record<string, string>
type Listener = () => void

let files: Files = {}
let currentFile: string | null = null
const listeners = new Set<Listener>()

let cachedFiles: Files | null = null
let cachedCodebook: Codebook | undefined

const notify = (): void => listeners.forEach((l) => l())
const debouncedNotify = debounce(notify, 80, { maxWait: 400 })

let projectId: string | null = null
let persistSuppressed = false
const persistDebounce = createScopedDebounce(500)

export const setProjectId = (id: string | null): void => { projectId = id }

export const withoutPersist = <T>(fn: () => T): T => {
  persistSuppressed = true
  try { return fn() }
  finally { persistSuppressed = false }
}

const persistWrite = (path: string): void => {
  if (!projectId || persistSuppressed) return
  const pid = projectId
  persistDebounce.call(path, async () => {
    const content = files[path]
    if (content === undefined) return
    await sendCommand(pid, { action: "WriteFile", path, content })
  })
}

const persistDeleteCommand = (path: string): void => {
  if (!projectId || persistSuppressed) return
  persistDebounce.cancel(path)
  sendCommand(projectId, { action: "DeleteFile", path }).catch(() => {})
}

const persistRenameCommand = (oldPath: string, newPath: string): void => {
  if (!projectId || persistSuppressed) return
  persistDebounce.cancel(oldPath)
  sendCommand(projectId, { action: "RenameFile", path: oldPath, newPath }).catch(() => {})
}

export const getFiles = (): Files => files

export const getFilesStripped = (): Files =>
  Object.fromEntries(Object.entries(files).map(([k, v]) => [k, stripPendingRefs(v)]))

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
  const marked = markPendingRefs(raw, definitions)
  const pendingRefsInNew = findPendingRefs(marked)
  if (pendingRefsInNew.length > 0) {
    console.debug(`[store] marked ${pendingRefsInNew.length} pending refs in "${filename}"`)
  }

  const newDefinitions = findDefinitionIds(raw)
  let updatedFiles: Files = { ...files, [filename]: marked }
  const resolvedPaths: string[] = []

  for (const defId of newDefinitions) {
    for (const [path, content] of Object.entries(updatedFiles)) {
      if (path === filename) continue
      const pendingRefIds = findPendingRefs(content)
      if (pendingRefIds.includes(defId)) {
        const resolved = resolvePendingRef(content, defId)
        updatedFiles = { ...updatedFiles, [path]: resolved }
        resolvedPaths.push(path)
      }
    }
  }

  if (resolvedPaths.length > 0) {
    console.debug(`[store] resolved ${resolvedPaths.length} pending refs`)
  }

  files = updatedFiles
  persistWrite(filename)
  for (const path of resolvedPaths) persistWrite(path)
  debouncedNotify()
}

export const deleteFile = (filename: string): void => {
  console.debug(`[store] deleteFile: "${filename}"`)
  const { [filename]: _, ...rest } = files
  files = rest
  if (currentFile === filename) {
    currentFile = null
  }
  persistDeleteCommand(filename)
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
  persistRenameCommand(oldName, newName)
  notify()
}

export const subscribe = (listener: Listener): (() => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
