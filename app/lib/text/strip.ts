interface StripOptions {
  keepHeadings?: boolean
}

const BOLD = /\*\*(.+?)\*\*/g
const ITALIC = /(?<!\*)\*([^*]+?)\*(?!\*)|_([^_]+?)_/g
const LINK = /\[([^\]]+)\]\([^)]+\)/g
const HEADING = /^#{1,6}\s+/gm
const LIST_ITEM = /^[-*+]\s+/gm
const INLINE_CODE = /`([^`]+)`/g
const STRIKETHROUGH = /~~(.+?)~~/g
const IMAGE = /!\[([^\]]*)\]\([^)]+\)/g
const TABLE_SEPARATOR = /^\|?[\s-:|]+\|[\s-:|]*$/gm
const TABLE_PIPE = /^\|(.+)\|$/gm
const NUMBERED_LIST = /^\d+\.\s+/gm
const BLOCKQUOTE = /^>\s?/gm

const baseReplacers: [RegExp, string][] = [
  [IMAGE, "$1"],
  [BOLD, "$1"],
  [STRIKETHROUGH, "$1"],
  [LINK, "$1"],
  [INLINE_CODE, "$1"],
  [ITALIC, "$1$2"],
  [LIST_ITEM, ""],
  [NUMBERED_LIST, ""],
  [BLOCKQUOTE, ""],
  [TABLE_SEPARATOR, ""],
  [TABLE_PIPE, "$1"],
]

const headingReplacer: [RegExp, string] = [HEADING, ""]

const buildReplacers = (options: StripOptions): [RegExp, string][] =>
  options.keepHeadings ? baseReplacers : [...baseReplacers, headingReplacer]

const applyReplacers = (text: string, replacers: [RegExp, string][]): string =>
  replacers.reduce((result, [pattern, replacement]) => result.replace(pattern, replacement), text)

export const stripMarkdown = (text: string, options: StripOptions = {}): string =>
  applyReplacers(text, buildReplacers(options))
