const FNV_OFFSET_A = 0x811c9dc5
const FNV_OFFSET_B = 0x050c5d1f
const FNV_PRIME = 0x01000193

export const fnvHash = (text: string): string => {
  let a = FNV_OFFSET_A
  let b = FNV_OFFSET_B
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i)
    a = Math.imul(a ^ c, FNV_PRIME) >>> 0
    b = Math.imul(b ^ c, FNV_PRIME) >>> 0
  }
  return a.toString(16).padStart(8, "0") + b.toString(16).padStart(8, "0")
}
