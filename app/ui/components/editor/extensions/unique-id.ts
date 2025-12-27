import UniqueID from "@tiptap/extension-unique-id"
import { isLockable } from "./lock"

export const BlockID = UniqueID.configure({
  attributeName: "blockId",
  types: ["paragraph", "heading", "blockquote", "codeBlock", "bulletList", "orderedList", "listItem", "taskList", "taskItem", "table", "image", "nabuQuestion"],
})
