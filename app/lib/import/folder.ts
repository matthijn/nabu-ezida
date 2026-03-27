const readFileEntry = (entry: FileSystemFileEntry): Promise<File> =>
  new Promise((resolve, reject) => {
    entry.file(resolve, reject)
  })

const readDirectoryEntries = (reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> =>
  new Promise((resolve, reject) => reader.readEntries(resolve, reject))

const readAllDirectoryEntries = async (
  reader: FileSystemDirectoryReader
): Promise<FileSystemEntry[]> => {
  const entries: FileSystemEntry[] = []
  let batch = await readDirectoryEntries(reader)
  while (batch.length > 0) {
    entries.push(...batch)
    batch = await readDirectoryEntries(reader)
  }
  return entries
}

const readEntry = async (entry: FileSystemEntry): Promise<File[]> => {
  if (entry.isFile) {
    return [await readFileEntry(entry as FileSystemFileEntry)]
  }

  const dirEntry = entry as FileSystemDirectoryEntry
  const reader = dirEntry.createReader()
  const entries = await readAllDirectoryEntries(reader)

  const nested = await Promise.all(entries.map((e) => readEntry(e)))
  return nested.flat()
}

export const readDroppedItems = async (dataTransfer: DataTransfer): Promise<File[]> => {
  const items = Array.from(dataTransfer.items)
  const entries = items
    .map((item) => item.webkitGetAsEntry())
    .filter((entry): entry is FileSystemEntry => entry !== null)

  if (entries.length === 0) {
    return Array.from(dataTransfer.files)
  }

  const nested = await Promise.all(entries.map((entry) => readEntry(entry)))
  return nested.flat()
}
