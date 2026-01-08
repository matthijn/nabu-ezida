import UniqueID from "@tiptap/extension-unique-id"

const generateBlockId = (): string => `block_${crypto.randomUUID()}`

export const BlockID = UniqueID.configure({
  attributeName: "blockId",
  generateID: generateBlockId,
  types: ["paragraph", "heading", "blockquote", "codeBlock", "bulletList", "orderedList", "listItem", "taskList", "taskItem", "table", "image", "nabuQuestion"],
})
