import type { Block } from "./block"

export type BlockOp =
  | { type: "remove"; id: string }
  | { type: "add"; block: Block; afterId: string | null }
  | { type: "replace"; block: Block }

type BlockMap = Map<string, Block>

const toBlockMap = (blocks: Block[]): BlockMap =>
  new Map(blocks.map((b) => [b.id!, b]))

const getOrderedIds = (blocks: Block[]): string[] =>
  blocks.map((b) => b.id!)

const blocksEqual = (a: Block, b: Block): boolean =>
  JSON.stringify(a) === JSON.stringify(b)

export const diffBlocks = (oldBlocks: Block[], newBlocks: Block[]): BlockOp[] => {
  const oldMap = toBlockMap(oldBlocks)
  const newMap = toBlockMap(newBlocks)
  const newIds = getOrderedIds(newBlocks)
  const ops: BlockOp[] = []

  for (const [id] of oldMap) {
    if (!newMap.has(id)) {
      ops.push({ type: "remove", id })
    }
  }

  for (let i = 0; i < newIds.length; i++) {
    const id = newIds[i]
    const newBlock = newMap.get(id)!
    const oldBlock = oldMap.get(id)

    if (!oldBlock) {
      const afterId = i === 0 ? null : newIds[i - 1]
      ops.push({ type: "add", block: newBlock, afterId })
    } else if (!blocksEqual(oldBlock, newBlock)) {
      ops.push({ type: "replace", block: newBlock })
    }
  }

  return ops
}

const hashBlock = (b: Block): string =>
  JSON.stringify([b.type, b.props, b.content])

const flattenBlockHashes = (blocks: Block[]): string[] => {
  const result: string[] = []
  for (const b of blocks) {
    result.push(hashBlock(b))
    if (b.children?.length) {
      result.push(...flattenBlockHashes(b.children))
    }
  }
  return result
}

export type BlockFingerprint = Set<string>

export const computeBlockFingerprint = (blocks: Block[]): BlockFingerprint =>
  new Set(flattenBlockHashes(blocks))

export const hasSignificantDrift = (
  previous: BlockFingerprint,
  current: BlockFingerprint,
  threshold = 0.1
): boolean => {
  const same = [...previous].filter(h => current.has(h)).length
  const total = Math.max(previous.size, current.size)
  return 1 - same / total > threshold
}

export const hasSignificantChange = (
  oldBlocks: Block[],
  newBlocks: Block[],
  threshold = 0.1
): boolean =>
  hasSignificantDrift(
    computeBlockFingerprint(oldBlocks),
    computeBlockFingerprint(newBlocks),
    threshold
  )
