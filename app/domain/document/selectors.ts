import type { Block } from "./block"

export type BlockTree = {
  blocks: Record<string, Block>
  head_id: string
  tail_id: string
}

export function blocksToArray(tree: BlockTree): Block[] {
  if (!tree.head_id || !tree.blocks) {
    return []
  }
  return collectSiblings(tree.blocks, tree.head_id, false)
}

export function blocksToArrayWithChildren(tree: BlockTree): Block[] {
  if (!tree.head_id || !tree.blocks) {
    return []
  }
  return collectSiblings(tree.blocks, tree.head_id, true)
}

function collectSiblings(blocks: Record<string, Block>, startId: string, hydrateChildren: boolean): Block[] {
  const result: Block[] = []
  let currentId: string | undefined = startId

  while (currentId) {
    const block: Block | undefined = blocks[currentId]
    if (!block) break

    if (hydrateChildren && block.first_child_id) {
      const children: Block[] = collectSiblings(blocks, block.first_child_id, true)
      result.push({ ...block, children })
    } else {
      result.push(block)
    }
    currentId = block.next_id
  }

  return result
}

export function getChildBlocks(blocks: Record<string, Block>, parentId: string): Block[] {
  const parent = blocks[parentId]
  if (!parent?.first_child_id) {
    return []
  }
  return collectSiblings(blocks, parent.first_child_id, false)
}
