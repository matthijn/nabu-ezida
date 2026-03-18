const BACKTICK_PATTERN = /```[\s\S]*?```|\[[^\]]*\]\([^)]*\)|`([^`]+)`/g
const MARKDOWN_PREFIX = /^(?:#{1,6}\s+|[-*+]\s+|\d+\.\s+|>\s+)+/
const INLINE_WRAPPER = /^(\*{1,3}|_{1,3})(.*)\1$/

const stripMarkdownSyntax = (text: string): string => {
  const withoutPrefix = text.replace(MARKDOWN_PREFIX, "")
  const withoutWrapper = withoutPrefix.replace(INLINE_WRAPPER, "$2")
  return withoutWrapper
}

export const normalizeBacktickQuotes = (text: string): string => {
  const pattern = new RegExp(BACKTICK_PATTERN.source, "g")
  let result = ""
  let lastIndex = 0

  while (true) {
    pattern.lastIndex = lastIndex
    const match = pattern.exec(text)
    if (!match) break

    if (match[1] === undefined) {
      result += text.slice(lastIndex, match.index + match[0].length)
      lastIndex = match.index + match[0].length
      continue
    }

    const stripped = stripMarkdownSyntax(match[1])
    result += text.slice(lastIndex, match.index) + `"${stripped}"`
    lastIndex = match.index + match[0].length
  }

  result += text.slice(lastIndex)
  return result
}
