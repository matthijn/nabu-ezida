import type { Block } from "~/lib/agent"

const toolLabels: Record<string, string> = {
  // start_exploration: "Exploring",
  // exploration_step: "Investigating",
  // create_plan: "Planning",
  // complete_step: "Progressing",
  // abort: "Stopping",
  execute_sql: "Reading",
  create_document: "Creating document",
  update_document: "Updating document",
  delete_document: "Deleting document",
  pin_document: "Pinning",
  unpin_document: "Unpinning",
  insert_blocks: "Writing",
  delete_blocks: "Removing content",
  move_blocks: "Reorganizing",
  update_block: "Editing",
  add_document_tags: "Adding tags",
  remove_document_tags: "Removing tags",
  add_annotations: "Annotating",
  remove_annotations: "Removing annotations",
  update_annotation_props: "Updating annotations",
  apply_patch: "Writing",
}

const findLastToolCallName = (history: Block[]): string | null => {
  for (let i = history.length - 1; i >= 0; i--) {
    const block = history[i]
    if (block.type === "tool_call" && block.calls.length > 0) {
      return block.calls[block.calls.length - 1].name
    }
  }
  return null
}

export const getSpinnerLabel = (history: Block[]): string => {
  const toolName = findLastToolCallName(history)
  if (!toolName) return "Thinking"
  return toolLabels[toolName] ?? "Thinking"
}
