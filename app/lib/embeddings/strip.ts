const BOLD = /\*\*(.+?)\*\*/g
const ITALIC = /(?<!\*)\*([^*]+?)\*(?!\*)|_([^_]+?)_/g
const LINK = /\[([^\]]+)\]\([^)]+\)/g
const HEADING = /^#{1,6}\s+/gm
const LIST_ITEM = /^[-*+]\s+/gm
const INLINE_CODE = /`([^`]+)`/g
const STRIKETHROUGH = /~~(.+?)~~/g

const replacers: [RegExp, string][] = [
  [BOLD, "$1"],
  [STRIKETHROUGH, "$1"],
  [LINK, "$1"],
  [INLINE_CODE, "$1"],
  [ITALIC, "$1$2"],
  [HEADING, ""],
  [LIST_ITEM, ""],
]

export const stripMarkdownFormatting = (text: string): string =>
  replacers.reduce((result, [pattern, replacement]) => result.replace(pattern, replacement), text)
