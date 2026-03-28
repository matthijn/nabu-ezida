const dotProduct = (a: number[], b: number[]): number => {
  let sum = 0
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i]
  return sum
}

const magnitude = (v: number[]): number => Math.sqrt(dotProduct(v, v))

export const cosineSimilarity = (a: number[], b: number[]): number => {
  const magA = magnitude(a)
  const magB = magnitude(b)
  if (magA === 0 || magB === 0) return 0
  return dotProduct(a, b) / (magA * magB)
}
