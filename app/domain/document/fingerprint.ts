import type { Block } from "./block"

export type BlockFingerprint = {
  blockCount: number
  textLength: number
  headingCount: number
}

export const computeBlockFingerprint = (blocks: Block[]): BlockFingerprint => ({
  blockCount: blocks.length,
  textLength: blocks.reduce((sum, b) => sum + (b.content?.map(c => c.type === "text" ? (c.text?.length ?? 0) : 0).reduce((a, b) => a + b, 0) ?? 0), 0),
  headingCount: blocks.filter(b => b.type === "heading").length,
})

const DRIFT_THRESHOLD = 0.2

export const hasSignificantBlockDrift = (prev: BlockFingerprint, curr: BlockFingerprint): boolean => {
  if (prev.blockCount === 0) return curr.blockCount > 0
  const blockDrift = Math.abs(curr.blockCount - prev.blockCount) / prev.blockCount
  const textDrift = prev.textLength > 0 ? Math.abs(curr.textLength - prev.textLength) / prev.textLength : curr.textLength > 0 ? 1 : 0
  return blockDrift > DRIFT_THRESHOLD || textDrift > DRIFT_THRESHOLD
}
