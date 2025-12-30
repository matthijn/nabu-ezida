import type { Block } from "~/domain/document"

type Position = "head" | "tail" | string

const command = <T>(action: string, aggregateId: string, payload: T) => ({
  type: "Command" as const,
  action,
  aggregate_type: "Document" as const,
  aggregate_id: aggregateId,
  payload,
})

/**
 * Commands for manipulating documents and their blocks.
 *
 * @example
 * ```ts
 * import { documentCommands } from "~/domain/api/commands"
 *
 * // Create a research document
 * await api.send(documentCommands.create(
 *   "doc-7f3b2a1e-4d5c-6e7f-8a9b-0c1d2e3f4a5b",
 *   "proj-1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
 *   "Literature Review",
 *   "Systematic review of cognitive load theory papers 2015-2024"
 * ))
 *
 * // Add findings as blocks
 * const blocks = [{
 *   id: "blk-8a9b0c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d",
 *   type: "paragraph",
 *   content: [{ type: "text", text: "Chen et al. found significant effects..." }]
 * }]
 * await api.send(documentCommands.insertBlocks("doc-7f3b2a1e-4d5c-6e7f-8a9b-0c1d2e3f4a5b", "tail", blocks))
 * ```
 */
export const documentCommands = {
  /**
   * Creates a new document in a project.
   * @param docId - Unique identifier for the new document
   * @param projectId - Project to create the document in
   * @param name - Document title (max 200 chars)
   * @param description - Optional description (max 2000 chars)
   *
   * @example
   * ```ts
   * documentCommands.create(
   *   "doc-a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
   *   "proj-1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
   *   "Methodology Chapter",
   *   "Mixed methods approach for studying working memory"
   * )
   * ```
   */
  create: (docId: string, projectId: string, name: string, description = "") =>
    command("CreateDocument", docId, { project_id: projectId, name, description }),

  /**
   * Updates document metadata (name and description).
   * @param docId - Document to update
   * @param name - New document title
   * @param description - New description
   *
   * @example
   * ```ts
   * documentCommands.update(
   *   "doc-a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
   *   "Methodology & Analysis",
   *   "Updated to include qualitative coding procedures"
   * )
   * ```
   */
  update: (docId: string, name: string, description = "") =>
    command("UpdateDocument", docId, { name, description }),

  /**
   * Pins a document for quick access.
   * @param docId - Document to pin
   *
   * @example
   * ```ts
   * // Pin frequently referenced sources
   * documentCommands.pin("doc-b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e")
   * ```
   */
  pin: (docId: string) =>
    command("PinDocument", docId, {}),

  /**
   * Unpins a previously pinned document.
   * @param docId - Document to unpin
   *
   * @example
   * ```ts
   * documentCommands.unpin("doc-b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e")
   * ```
   */
  unpin: (docId: string) =>
    command("UnpinDocument", docId, {}),

  /**
   * Deletes a document permanently.
   * @param docId - Document to delete
   *
   * @example
   * ```ts
   * // Remove outdated draft
   * documentCommands.delete("doc-c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f")
   * ```
   */
  delete: (docId: string) =>
    command("DeleteDocument", docId, {}),

  /**
   * Inserts blocks at a position in the document.
   * @param docId - Target document
   * @param position - "head", "tail", or a block ID to insert after
   * @param blocks - Blocks to insert
   *
   * @example
   * ```ts
   * // Add extracted findings to literature review
   * const findings = [
   *   {
   *     id: "blk-d4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a",
   *     type: "paragraph",
   *     content: [{ type: "text", text: "Chen et al. (2019) reported effect size d=0.82" }]
   *   },
   *   {
   *     id: "blk-e5f6a7b8-c9d0-1e2f-3a4b-5c6d7e8f9a0b",
   *     type: "paragraph",
   *     content: [{ type: "text", text: "Smith & Jones (2020) replicated with d=0.76" }]
   *   }
   * ]
   * documentCommands.insertBlocks("doc-7f3b2a1e-4d5c-6e7f-8a9b-0c1d2e3f4a5b", "tail", findings)
   *
   * // Insert after specific block
   * documentCommands.insertBlocks("doc-7f3b2a1e-4d5c-6e7f-8a9b-0c1d2e3f4a5b", "blk-a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d", findings)
   * ```
   */
  insertBlocks: (docId: string, position: Position, blocks: Block[]) =>
    command("InsertBlocks", docId, { position, blocks }),

  /**
   * Deletes blocks from a document.
   * @param docId - Target document
   * @param blockIds - IDs of blocks to delete
   *
   * @example
   * ```ts
   * // Remove superseded analysis
   * documentCommands.deleteBlocks("doc-7f3b2a1e-4d5c-6e7f-8a9b-0c1d2e3f4a5b", [
   *   "blk-f6a7b8c9-d0e1-2f3a-4b5c-6d7e8f9a0b1c",
   *   "blk-a7b8c9d0-e1f2-3a4b-5c6d-7e8f9a0b1c2d"
   * ])
   * ```
   */
  deleteBlocks: (docId: string, blockIds: string[]) =>
    command("DeleteBlocks", docId, { block_ids: blockIds }),

  /**
   * Replaces existing blocks with new blocks.
   * @param docId - Target document
   * @param blockIds - IDs of blocks to replace
   * @param blocks - New blocks to insert in their place
   *
   * @example
   * ```ts
   * // Update summary with revised findings
   * const revisedSummary = [{
   *   id: "blk-b8c9d0e1-f2a3-4b5c-6d7e-8f9a0b1c2d3e",
   *   type: "paragraph",
   *   content: [{ type: "text", text: "Meta-analysis shows pooled effect size of 0.79 (CI: 0.65-0.93)" }]
   * }]
   * documentCommands.replaceBlocks(
   *   "doc-7f3b2a1e-4d5c-6e7f-8a9b-0c1d2e3f4a5b",
   *   ["blk-c9d0e1f2-a3b4-5c6d-7e8f-9a0b1c2d3e4f"],
   *   revisedSummary
   * )
   * ```
   */
  replaceBlocks: (docId: string, blockIds: string[], blocks: Block[]) =>
    command("ReplaceBlocks", docId, { block_ids: blockIds, blocks }),

  /**
   * Moves blocks to a new position.
   * @param docId - Target document
   * @param blockIds - IDs of blocks to move
   * @param position - "head", "tail", or block ID to move after
   *
   * @example
   * ```ts
   * // Reorganize sections - move discussion before conclusion
   * documentCommands.moveBlocks(
   *   "doc-7f3b2a1e-4d5c-6e7f-8a9b-0c1d2e3f4a5b",
   *   ["blk-d0e1f2a3-b4c5-6d7e-8f9a-0b1c2d3e4f5a"],
   *   "blk-e1f2a3b4-c5d6-7e8f-9a0b-1c2d3e4f5a6b"
   * )
   * ```
   */
  moveBlocks: (docId: string, blockIds: string[], position: Position) =>
    command("MoveBlocks", docId, { block_ids: blockIds, position }),

  /**
   * Replaces entire document content.
   * @param docId - Target document
   * @param content - New content blocks
   *
   * @example
   * ```ts
   * // Import converted PDF content
   * const extractedContent = [
   *   {
   *     id: "blk-f2a3b4c5-d6e7-8f9a-0b1c-2d3e4f5a6b7c",
   *     type: "heading",
   *     props: { level: 1 },
   *     content: [{ type: "text", text: "Abstract" }]
   *   },
   *   {
   *     id: "blk-a3b4c5d6-e7f8-9a0b-1c2d-3e4f5a6b7c8d",
   *     type: "paragraph",
   *     content: [{ type: "text", text: "This study examines..." }]
   *   }
   * ]
   * documentCommands.replaceContent("doc-7f3b2a1e-4d5c-6e7f-8a9b-0c1d2e3f4a5b", extractedContent)
   * ```
   */
  replaceContent: (docId: string, content: Block[]) =>
    command("ReplaceContent", docId, { content }),

  /**
   * Updates properties of existing blocks.
   * @param docId - Target document
   * @param blockIds - IDs of blocks to update
   * @param props - Properties to merge into existing props
   *
   * @example
   * ```ts
   * // Promote subsection to section heading
   * documentCommands.updateBlockProps(
   *   "doc-7f3b2a1e-4d5c-6e7f-8a9b-0c1d2e3f4a5b",
   *   ["blk-b4c5d6e7-f8a9-0b1c-2d3e-4f5a6b7c8d9e"],
   *   { level: 1 }
   * )
   *
   * // Update figure dimensions
   * documentCommands.updateBlockProps(
   *   "doc-7f3b2a1e-4d5c-6e7f-8a9b-0c1d2e3f4a5b",
   *   ["blk-c5d6e7f8-a9b0-1c2d-3e4f-5a6b7c8d9e0f"],
   *   { width: 600 }
   * )
   * ```
   */
  updateBlockProps: (docId: string, blockIds: string[], props: Record<string, unknown>) =>
    command("UpdateBlockProps", docId, { block_ids: blockIds, props }),

  /**
   * Adds tags to a document for categorization.
   * @param docId - Target document
   * @param tags - Tags to add
   *
   * @example
   * ```ts
   * // Categorize for systematic review
   * documentCommands.addTags("doc-7f3b2a1e-4d5c-6e7f-8a9b-0c1d2e3f4a5b", [
   *   "empirical",
   *   "rct",
   *   "cognitive-load",
   *   "included"
   * ])
   * ```
   */
  addTags: (docId: string, tags: string[]) =>
    command("AddDocumentTags", docId, { tags }),

  /**
   * Removes tags from a document.
   * @param docId - Target document
   * @param tags - Tags to remove
   *
   * @example
   * ```ts
   * // Update review status
   * documentCommands.removeTags("doc-7f3b2a1e-4d5c-6e7f-8a9b-0c1d2e3f4a5b", ["pending-review"])
   * ```
   */
  removeTags: (docId: string, tags: string[]) =>
    command("RemoveDocumentTags", docId, { tags }),
}
