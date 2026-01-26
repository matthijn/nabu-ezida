type FileWithPath = {
  file: File
  pathTags: string[]
}

const getPathTags = (path: string): string[] => {
  const parts = path.split("/").filter(Boolean)
  return parts.slice(0, -1) // exclude filename
}

const readFileEntry = (entry: FileSystemFileEntry, path: string): Promise<FileWithPath> =>
  new Promise((resolve, reject) => {
    entry.file(
      (file) => resolve({ file, pathTags: getPathTags(path) }),
      reject
    )
  })

const readDirectoryEntries = (reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> =>
  new Promise((resolve, reject) => reader.readEntries(resolve, reject))

const readAllDirectoryEntries = async (reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> => {
  const entries: FileSystemEntry[] = []
  let batch = await readDirectoryEntries(reader)
  while (batch.length > 0) {
    entries.push(...batch)
    batch = await readDirectoryEntries(reader)
  }
  return entries
}

const readEntry = async (entry: FileSystemEntry, path: string): Promise<FileWithPath[]> => {
  if (entry.isFile) {
    return [await readFileEntry(entry as FileSystemFileEntry, path)]
  }

  const dirEntry = entry as FileSystemDirectoryEntry
  const reader = dirEntry.createReader()
  const entries = await readAllDirectoryEntries(reader)

  const nested = await Promise.all(
    entries.map((e) => readEntry(e, `${path}/${e.name}`))
  )
  return nested.flat()
}

export const readDroppedItems = async (dataTransfer: DataTransfer): Promise<FileWithPath[]> => {
  const items = Array.from(dataTransfer.items)
  const entries = items
    .map((item) => item.webkitGetAsEntry())
    .filter((entry): entry is FileSystemEntry => entry !== null)

  if (entries.length === 0) {
    // Fallback for browsers without webkitGetAsEntry
    return Array.from(dataTransfer.files).map((file) => ({ file, pathTags: [] }))
  }

  const nested = await Promise.all(
    entries.map((entry) => readEntry(entry, entry.name))
  )
  return nested.flat()
}

export type { FileWithPath }
