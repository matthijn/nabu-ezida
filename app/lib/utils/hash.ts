const FNV_OFFSET = 0x811c9dc5
const FNV_PRIME = 0x01000193

export const fnvHash = (text: string): string => {
  let hash = FNV_OFFSET
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, FNV_PRIME) >>> 0
  }
  return hash.toString(16).padStart(8, "0")
}
