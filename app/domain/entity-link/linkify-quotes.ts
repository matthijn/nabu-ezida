import { findMatchOffset } from "~/lib/diff/fuzzy-inline"
import { serializeSpotlight } from "~/domain/spotlight/serialize"

const QUOTE_PATTERN =
  /\[([^\]]*)\]\([^)]*\)|[\u201C\u201D""]([^"\u201C\u201D""]+?)[\u201C\u201D""]/g

const encodeSpotlightText = (text: string): string =>
  encodeURIComponent(serializeSpotlight({ type: "single", text }))

const buildSpotlightLink = (quoted: string, documentId: string): string =>
  `[${quoted}](file://${documentId}/${encodeSpotlightText(quoted)})`

export const linkifyQuotes = (
  text: string,
  documentId: string | null,
  fileContent: string | null
): string => {
  if (!documentId || !fileContent) return text

  const pattern = new RegExp(QUOTE_PATTERN.source, "g")
  let result = ""
  let lastIndex = 0

  while (true) {
    pattern.lastIndex = lastIndex
    const match = pattern.exec(text)
    if (!match) break

    if (match[1] !== undefined) {
      result += text.slice(lastIndex, match.index + match[0].length)
      lastIndex = match.index + match[0].length
      continue
    }

    const quoted = match[2]
    const offset = findMatchOffset(fileContent, quoted)

    if (!offset) {
      result += text.slice(lastIndex, match.index + match[0].length)
      lastIndex = match.index + match[0].length
      continue
    }

    result += text.slice(lastIndex, match.index) + buildSpotlightLink(quoted, documentId)
    lastIndex = match.index + match[0].length
  }

  result += text.slice(lastIndex)
  return result
}
