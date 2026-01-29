type Files = Record<string, string>
type Listener = () => void

const STORAGE_KEY = "nabu:files"

let files: Files = {}
let currentFile: string | null = null
const listeners = new Set<Listener>()

const notify = (): void => listeners.forEach((l) => l())

export const getFiles = (): Files => files

export const getFile = (filename: string): string | undefined => files[filename]

export const getFileRaw = (filename: string): string => files[filename] ?? ""

export const getCurrentFile = (): string | null => currentFile

export const getFileLineCount = (filename: string): number =>
  getFileRaw(filename).split("\n").length

export const setFiles = (newFiles: Record<string, string>): void => {
  files = newFiles
  notify()
}

export const setCurrentFile = (filename: string | null): void => {
  currentFile = filename
  notify()
}

export const updateFileRaw = (filename: string, raw: string): void => {
  files = { ...files, [filename]: raw }
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

export const renameFile = (oldName: string, newName: string): void => {
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
      const parsed = JSON.parse(stored) as Record<string, string> | Record<string, { raw: string }>
      const first = Object.values(parsed)[0]
      if (first && typeof first === "object" && "raw" in first) {
        files = Object.fromEntries(
          Object.entries(parsed as Record<string, { raw: string }>).map(([k, v]) => [k, v.raw])
        )
      } else {
        files = parsed as Record<string, string>
      }
      notify()
    }
  } catch {
    // parse error or localStorage unavailable
  }
}
