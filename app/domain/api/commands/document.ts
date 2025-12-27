import type { Block } from "~/domain/document"

const command = <T>(action: string, aggregateId: string, payload: T) => ({
  type: "Command" as const,
  action,
  aggregate_type: "Document" as const,
  aggregate_id: aggregateId,
  payload,
})

export const documentCommands = {
  insertBlocks: (docId: string, position: string, blocks: Block[]) =>
    command("InsertBlocks", docId, { position, blocks }),

  deleteBlocks: (docId: string, blockIds: string[]) =>
    command("DeleteBlocks", docId, { block_ids: blockIds }),

  replaceBlocks: (docId: string, blockIds: string[], blocks: Block[]) =>
    command("ReplaceBlocks", docId, { block_ids: blockIds, blocks }),

  moveBlocks: (docId: string, blockIds: string[], position: string) =>
    command("MoveBlocks", docId, { block_ids: blockIds, position }),

  replaceContent: (docId: string, content: Block[]) =>
    command("ReplaceContent", docId, { content }),

  updateBlockProps: (docId: string, blockIds: string[], props: Record<string, unknown>) =>
    command("UpdateBlockProps", docId, { block_ids: blockIds, props }),
}
