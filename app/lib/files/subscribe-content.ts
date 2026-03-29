import { subscribe, getFiles, type FileStore } from "./store"
import { isHiddenFile } from "./filename"

const hasContentChanges = (prev: FileStore, curr: FileStore): boolean => {
  const allKeys = new Set([...Object.keys(prev), ...Object.keys(curr)])
  for (const key of allKeys) {
    if (isHiddenFile(key)) continue
    if (prev[key] !== curr[key]) return true
  }
  return false
}

export const subscribeContentChanges = (listener: () => void): (() => void) => {
  let previous = getFiles()
  return subscribe(() => {
    const current = getFiles()
    if (hasContentChanges(previous, current)) listener()
    previous = current
  })
}
