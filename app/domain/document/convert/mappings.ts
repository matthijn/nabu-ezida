import type { Styles } from "../block"
import type { JSONContent } from "@tiptap/react"

// Bidirectional style ↔ mark mapping
type StyleKey = keyof Styles
type MarkType = string

const styleMarkPairs: [StyleKey, MarkType][] = [
  ["bold", "bold"],
  ["italic", "italic"],
  ["underline", "underline"],
  ["strikethrough", "strike"],
  ["code", "code"],
]

export const styleToMark = (key: StyleKey): MarkType | undefined =>
  styleMarkPairs.find(([s]) => s === key)?.[1]

export const markToStyle = (type: MarkType): StyleKey | undefined =>
  styleMarkPairs.find(([, m]) => m === type)?.[0]

export const allStyleKeys = styleMarkPairs.map(([s]) => s)
export const allMarkTypes = styleMarkPairs.map(([, m]) => m)

// Block type mappings
type BlockTypeName = string
type TiptapTypeName = string

const blockTypePairs: [BlockTypeName, TiptapTypeName][] = [
  ["paragraph", "paragraph"],
  ["heading", "heading"],
  ["quote", "blockquote"],
  ["codeBlock", "codeBlock"],
  ["image", "image"],
  ["table", "table"],
]

export const blockTypeToTiptap = (type: BlockTypeName): TiptapTypeName =>
  blockTypePairs.find(([b]) => b === type)?.[1] ?? "paragraph"

export const tiptapTypeToBlock = (type: TiptapTypeName): BlockTypeName | undefined =>
  blockTypePairs.find(([, t]) => t === type)?.[0]

// List type mappings
type ListItemType = "bulletListItem" | "numberedListItem" | "checkListItem"
type ListWrapperType = "bulletList" | "orderedList" | "taskList"
type ListItemNodeType = "listItem" | "listItem" | "taskItem"

type ListMapping = {
  itemType: ListItemType
  wrapperType: ListWrapperType
  nodeType: ListItemNodeType
}

const listMappings: ListMapping[] = [
  { itemType: "bulletListItem", wrapperType: "bulletList", nodeType: "listItem" },
  { itemType: "numberedListItem", wrapperType: "orderedList", nodeType: "listItem" },
  { itemType: "checkListItem", wrapperType: "taskList", nodeType: "taskItem" },
]

export const getListMapping = (itemType: ListItemType): ListMapping | undefined =>
  listMappings.find((m) => m.itemType === itemType)

export const getListMappingByWrapper = (wrapperType: string): ListMapping | undefined =>
  listMappings.find((m) => m.wrapperType === wrapperType)

export const isListItemType = (type: string): type is ListItemType =>
  listMappings.some((m) => m.itemType === type)

export const isListWrapperType = (type: string): type is ListWrapperType =>
  listMappings.some((m) => m.wrapperType === type)
