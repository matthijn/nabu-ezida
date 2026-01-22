type Files = Record<string, string>
type Listener = () => void

let files: Files = {}
let currentFile: string | null = null
const listeners = new Set<Listener>()

const notify = (): void => {
  listeners.forEach(l => l())
}

export const getFiles = (): Files => files

export const getCurrentFile = (): string | null => currentFile

export const getFileContent = (filename: string): string => files[filename] ?? ""

export const setFiles = (newFiles: Files): void => {
  files = newFiles
  notify()
}

export const setCurrentFile = (filename: string | null): void => {
  currentFile = filename
  notify()
}

export const updateFile = (filename: string, content: string): void => {
  files = { ...files, [filename]: content }
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
