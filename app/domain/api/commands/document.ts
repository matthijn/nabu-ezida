import type { Block, Annotation } from "~/domain/document"

type Position = "head" | "tail" | string

type CreateArgs = { project_id: string; name: string; description?: string }
type UpdateArgs = { document_id: string; name: string; description?: string }
type IdArgs = { document_id: string }
type InsertBlocksArgs = { document_id: string; position: Position; blocks: Block[] }
type BlockIdsArgs = { document_id: string; block_ids: string[] }
type MoveBlocksArgs = { document_id: string; block_ids: string[]; position: Position }
type ReplaceContentArgs = { document_id: string; content: Block[] }
type InlineContent = { type: string; text?: string; styles?: Record<string, unknown>; href?: string; content?: Array<{ type: string; text: string; styles?: Record<string, unknown> }> }
type UpdateBlockArgs = { document_id: string; block_id: string; type?: string; props?: Record<string, unknown>; content?: InlineContent[] }
type TagsArgs = { document_id: string; tags: string[] }
type AnnotationArgs = { document_id: string; annotation: Annotation }
type AnnotationIdsArgs = { document_id: string; annotation_ids: string[] }
type UpdateAnnotationPropsArgs = { document_id: string; annotation_ids: string[]; props: Partial<Pick<Annotation, "color" | "reason" | "payload">> }

const createCommand = <T>(action: string, aggregateType: string, payload: T) => ({
  type: "Command" as const,
  action,
  aggregate_type: aggregateType,
  payload,
})

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
 * await api.send(documentCommands.create_document({
 *   project_id: "proj-1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
 *   name: "Literature Review",
 *   description: "Systematic review of cognitive load theory papers 2015-2024"
 * }))
 *
 * // Add findings as blocks
 * const blocks = [{
 *   id: "blk-8a9b0c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d",
 *   type: "paragraph",
 *   content: [{ type: "text", text: "Chen et al. found significant effects..." }]
 * }]
 * await api.send(documentCommands.insert_blocks({
 *   document_id: "doc-7f3b2a1e-4d5c-6e7f-8a9b-0c1d2e3f4a5b",
 *   position: "tail",
 *   blocks
 * }))
 * ```
 */
export const documentCommands = {
  /**
   * Creates a new document in a project.
   * @param args.project_id - Project to create the document in
   * @param args.name - Document title (max 200 chars)
   * @param args.description - Optional description (max 2000 chars)
   *
   * @example
   * ```ts
   * documentCommands.create_document({
   *   project_id: "proj-1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
   *   name: "Methodology Chapter",
   *   description: "Mixed methods approach for studying working memory"
   * })
   * ```
   */
  create_document: (args: CreateArgs) =>
    createCommand("CreateDocument", "Document", { project_id: args.project_id, name: args.name, description: args.description ?? "" }),

  /**
   * Updates document metadata (name and description).
   * @param args.document_id - Document to update
   * @param args.name - New document title
   * @param args.description - New description
   *
   * @example
   * ```ts
   * documentCommands.update_document({
   *   document_id: "doc-a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
   *   name: "Methodology & Analysis",
   *   description: "Updated to include qualitative coding procedures"
   * })
   * ```
   */
  update_document: (args: UpdateArgs) =>
    command("UpdateDocument", args.document_id, { name: args.name, description: args.description ?? "" }),

  /**
   * Pins a document for quick access.
   * @param args.document_id - Document to pin
   *
   * @example
   * ```ts
   * documentCommands.pin_document({ document_id: "doc-b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e" })
   * ```
   */
  pin_document: (args: IdArgs) =>
    command("PinDocument", args.document_id, {}),

  /**
   * Unpins a previously pinned document.
   * @param args.document_id - Document to unpin
   *
   * @example
   * ```ts
   * documentCommands.unpin_document({ document_id: "doc-b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e" })
   * ```
   */
  unpin_document: (args: IdArgs) =>
    command("UnpinDocument", args.document_id, {}),

  /**
   * Deletes a document permanently.
   * @param args.document_id - Document to delete
   *
   * @example
   * ```ts
   * documentCommands.delete_document({ document_id: "doc-c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f" })
   * ```
   */
  delete_document: (args: IdArgs) =>
    command("DeleteDocument", args.document_id, {}),

  /**
   * Inserts blocks at a position in the document.
   * @param args.document_id - Target document
   * @param args.position - "head", "tail", or a block ID to insert after
   * @param args.blocks - Blocks to insert
   *
   * @example
   * ```ts
   * const findings = [
   *   {
   *     id: "blk-d4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a",
   *     type: "paragraph",
   *     content: [{ type: "text", text: "Chen et al. (2019) reported effect size d=0.82" }]
   *   }
   * ]
   * documentCommands.insert_blocks({
   *   document_id: "doc-7f3b2a1e-4d5c-6e7f-8a9b-0c1d2e3f4a5b",
   *   position: "tail",
   *   blocks: findings
   * })
   * ```
   */
  insert_blocks: (args: InsertBlocksArgs) =>
    command("InsertBlocks", args.document_id, { position: args.position, blocks: args.blocks }),

  /**
   * Deletes blocks from a document.
   * @param args.document_id - Target document
   * @param args.block_ids - IDs of blocks to delete
   *
   * @example
   * ```ts
   * documentCommands.delete_blocks({
   *   document_id: "doc-7f3b2a1e-4d5c-6e7f-8a9b-0c1d2e3f4a5b",
   *   block_ids: ["blk-f6a7b8c9-d0e1-2f3a-4b5c-6d7e8f9a0b1c"]
   * })
   * ```
   */
  delete_blocks: (args: BlockIdsArgs) =>
    command("DeleteBlocks", args.document_id, { block_ids: args.block_ids }),

  /**
   * Moves blocks to a new position.
   * @param args.document_id - Target document
   * @param args.block_ids - IDs of blocks to move
   * @param args.position - "head", "tail", or block ID to move after
   *
   * @example
   * ```ts
   * documentCommands.move_blocks({
   *   document_id: "doc-7f3b2a1e-4d5c-6e7f-8a9b-0c1d2e3f4a5b",
   *   block_ids: ["blk-d0e1f2a3-b4c5-6d7e-8f9a-0b1c2d3e4f5a"],
   *   position: "blk-e1f2a3b4-c5d6-7e8f-9a0b-1c2d3e4f5a6b"
   * })
   * ```
   */
  move_blocks: (args: MoveBlocksArgs) =>
    command("MoveBlocks", args.document_id, { block_ids: args.block_ids, position: args.position }),

  /**
   * Replaces entire document content.
   * @param args.document_id - Target document
   * @param args.content - New content blocks
   *
   * @example
   * ```ts
   * const extractedContent = [
   *   {
   *     id: "blk-f2a3b4c5-d6e7-8f9a-0b1c-2d3e4f5a6b7c",
   *     type: "heading",
   *     props: { level: 1 },
   *     content: [{ type: "text", text: "Abstract" }]
   *   }
   * ]
   * documentCommands.replace_content({
   *   document_id: "doc-7f3b2a1e-4d5c-6e7f-8a9b-0c1d2e3f4a5b",
   *   content: extractedContent
   * })
   * ```
   */
  replace_content: (args: ReplaceContentArgs) =>
    command("ReplaceContent", args.document_id, { content: args.content }),

  /**
   * Updates a block's type, properties, and/or content while preserving block ID.
   * All fields except block_id are optional - only provided fields are updated.
   * @param args.document_id - Target document
   * @param args.block_id - ID of block to update
   * @param args.type - New block type (optional)
   * @param args.props - Properties to merge (optional)
   * @param args.content - New content (optional)
   *
   * @example
   * ```ts
   * // Change text content
   * documentCommands.update_block({
   *   document_id: "doc-7f3b2a1e-4d5c-6e7f-8a9b-0c1d2e3f4a5b",
   *   block_id: "blk-a1b2c3d4",
   *   content: [{ type: "text", text: "Updated text" }]
   * })
   *
   * // Change styling
   * documentCommands.update_block({
   *   document_id: "doc-7f3b2a1e-4d5c-6e7f-8a9b-0c1d2e3f4a5b",
   *   block_id: "blk-a1b2c3d4",
   *   props: { background_color: "green" }
   * })
   *
   * // Change type and content together
   * documentCommands.update_block({
   *   document_id: "doc-7f3b2a1e-4d5c-6e7f-8a9b-0c1d2e3f4a5b",
   *   block_id: "blk-a1b2c3d4",
   *   type: "heading",
   *   props: { level: 2 },
   *   content: [{ type: "text", text: "New Heading" }]
   * })
   * ```
   */
  update_block: (args: UpdateBlockArgs) =>
    command("UpdateBlock", args.document_id, {
      block_id: args.block_id,
      ...(args.type && { type: args.type }),
      ...(args.props && { props: args.props }),
      ...(args.content && { content: args.content }),
    }),

  /**
   * Adds tags to a document for categorization.
   * @param args.document_id - Target document
   * @param args.tags - Tags to add
   *
   * @example
   * ```ts
   * documentCommands.add_document_tags({
   *   document_id: "doc-7f3b2a1e-4d5c-6e7f-8a9b-0c1d2e3f4a5b",
   *   tags: ["empirical", "rct", "cognitive-load"]
   * })
   * ```
   */
  add_document_tags: (args: TagsArgs) =>
    command("AddDocumentTags", args.document_id, { tags: args.tags }),

  /**
   * Removes tags from a document.
   * @param args.document_id - Target document
   * @param args.tags - Tags to remove
   *
   * @example
   * ```ts
   * documentCommands.remove_document_tags({
   *   document_id: "doc-7f3b2a1e-4d5c-6e7f-8a9b-0c1d2e3f4a5b",
   *   tags: ["pending-review"]
   * })
   * ```
   */
  remove_document_tags: (args: TagsArgs) =>
    command("RemoveDocumentTags", args.document_id, { tags: args.tags }),

  /**
   * Adds a single annotation to a document for qualitative coding.
   * Text is fuzzy-matched against document content.
   * @param args.document_id - Target document
   * @param args.annotation - Annotation to add
   *
   * @example
   * ```ts
   * documentCommands.add_annotation({
   *   document_id: "doc-7f3b2a1e-4d5c-6e7f-8a9b-0c1d2e3f4a5b",
   *   annotation: {
   *     text: "I found the interface confusing at first",
   *     actor: "researcher-1",
   *     color: "amber",
   *     reason: "Usability issue identified",
   *     payload: { type: "coding", code_id: "code-b2c3d4e5", confidence: "high" }
   *   }
   * })
   * ```
   */
  add_annotation: (args: AnnotationArgs) =>
    command("AddAnnotation", args.document_id, { annotation: args.annotation }),

  /**
   * Removes annotations from a document.
   * @param args.document_id - Target document
   * @param args.annotation_ids - IDs of annotations to remove
   *
   * @example
   * ```ts
   * documentCommands.remove_annotations({
   *   document_id: "doc-7f3b2a1e-4d5c-6e7f-8a9b-0c1d2e3f4a5b",
   *   annotation_ids: ["ann-c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f"]
   * })
   * ```
   */
  remove_annotations: (args: AnnotationIdsArgs) =>
    command("RemoveAnnotations", args.document_id, { annotation_ids: args.annotation_ids }),

  /**
   * Updates properties of existing annotations.
   * Cannot change text - that would invalidate the position.
   * @param args.document_id - Target document
   * @param args.annotation_ids - IDs of annotations to update
   * @param args.props - Properties to merge (color, reason, payload)
   *
   * @example
   * ```ts
   * documentCommands.update_annotation_props({
   *   document_id: "doc-7f3b2a1e-4d5c-6e7f-8a9b-0c1d2e3f4a5b",
   *   annotation_ids: ["ann-d4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a"],
   *   props: {
   *     payload: { type: "coding", code_id: "code-e5f6a7b8", confidence: "medium" },
   *     reason: "Recoded after team calibration session"
   *   }
   * })
   * ```
   */
  update_annotation_props: (args: UpdateAnnotationPropsArgs) =>
    command("UpdateAnnotationProps", args.document_id, { annotation_ids: args.annotation_ids, props: args.props }),
}
