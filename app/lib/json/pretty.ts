export class PrettyJsonError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "PrettyJsonError"
  }
}

const JSON_BLOCK_REGEX = /```(json-\S+)\n([\s\S]*?)```/g

const TRIPLE_QUOTE_REGEX = /"""\s*\n([\s\S]*?)\n\s*"""/g

const hasTripleQuote = (s: string): boolean => s.includes('"""')

const hasNewline = (s: string): boolean => s.includes("\n")

const isJsonBlock = (language: string): boolean => language.startsWith("json-")

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }

type MultilineMarker = { __multiline__: string }

const isMultilineMarker = (value: JsonValue): value is MultilineMarker =>
  value !== null &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  "__multiline__" in value &&
  typeof value.__multiline__ === "string"

const expandValue = (value: JsonValue): JsonValue => {
  if (typeof value === "string" && hasNewline(value)) {
    return { __multiline__: value }
  }
  if (Array.isArray(value)) {
    return value.map(expandValue)
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, expandValue(v)])
    )
  }
  return value
}

const collapseValue = (value: JsonValue): JsonValue => {
  if (isMultilineMarker(value)) {
    return value.__multiline__
  }
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, collapseValue(v)])
    )
  }
  if (Array.isArray(value)) {
    return value.map(collapseValue)
  }
  return value
}

const isSimpleArray = (arr: JsonValue[]): boolean =>
  arr.every((item) =>
    typeof item === "string" ||
    typeof item === "number" ||
    typeof item === "boolean" ||
    item === null
  )

const serializeJson = (obj: JsonValue, indent: number, expandMultiline: boolean): string => {
  const spaces = "  ".repeat(indent)
  const childSpaces = "  ".repeat(indent + 1)

  if (obj === null) return "null"
  if (typeof obj === "boolean") return obj.toString()
  if (typeof obj === "number") return obj.toString()
  if (typeof obj === "string") return JSON.stringify(obj)

  if (Array.isArray(obj)) {
    if (obj.length === 0) return "[]"
    if (isSimpleArray(obj)) {
      return "[" + obj.map((item) => JSON.stringify(item)).join(", ") + "]"
    }
    const items = obj.map((item) => childSpaces + serializeJson(item, indent + 1, expandMultiline))
    return "[\n" + items.join(",\n") + "\n" + spaces + "]"
  }

  if (typeof obj === "object") {
    if (expandMultiline && isMultilineMarker(obj)) {
      return `"""\n${obj.__multiline__}\n"""`
    }

    const entries = Object.entries(obj)
    if (entries.length === 0) return "{}"

    const lines = entries.map(([key, value]) => {
      const serialized = serializeJson(value, indent + 1, expandMultiline)
      return `${childSpaces}${JSON.stringify(key)}: ${serialized}`
    })

    return "{\n" + lines.join(",\n") + "\n" + spaces + "}"
  }

  return String(obj)
}

const collapseTripleQuotes = (content: string): string =>
  content.replace(TRIPLE_QUOTE_REGEX, (_, inner) => JSON.stringify(inner))

const parseMultilineJson = (content: string): JsonValue => {
  const collapsed = collapseTripleQuotes(content)

  if (hasTripleQuote(collapsed)) {
    const match = collapsed.match(/"""/)
    const position = match?.index ?? 0
    const context = collapsed.slice(Math.max(0, position - 20), position + 30)
    throw new PrettyJsonError(
      `Malformed """ in JSON block. The """ multiline string was not properly closed. ` +
      `Expected format: """|newline|content|newline|""". Found near: "${context}"`
    )
  }

  try {
    return JSON.parse(collapsed) as JsonValue
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error"
    throw new PrettyJsonError(`Invalid JSON after collapsing """ strings: ${message}`)
  }
}

const transformBlock = (
  content: string,
  transform: (parsed: JsonValue) => string
): string => {
  try {
    const parsed = JSON.parse(content) as JsonValue
    return transform(parsed)
  } catch {
    return content
  }
}

const transformPrettyBlock = (
  content: string,
  transform: (parsed: JsonValue) => string
): string => {
  const parsed = parseMultilineJson(content)
  return transform(parsed)
}

const transformJsonBlocks = (
  markdown: string,
  blockTransform: (content: string, language: string) => string
): string => {
  let result = markdown
  let offset = 0

  const matches = [...markdown.matchAll(JSON_BLOCK_REGEX)]

  for (const match of matches) {
    const [fullMatch, language, content] = match
    const matchStart = match.index!

    if (!isJsonBlock(language)) continue

    const transformed = blockTransform(content.trim(), language)
    const newBlock = "```" + language + "\n" + transformed + "\n```"

    const adjustedStart = matchStart + offset
    const adjustedEnd = adjustedStart + fullMatch.length

    result = result.slice(0, adjustedStart) + newBlock + result.slice(adjustedEnd)
    offset += newBlock.length - fullMatch.length
  }

  return result
}

export const toExtraPretty = (markdown: string): string =>
  transformJsonBlocks(markdown, (content) =>
    transformBlock(content, (parsed) => {
      const expanded = expandValue(parsed)
      return serializeJson(expanded, 0, true)
    })
  )

const validateBalancedFences = (markdown: string): void => {
  const fenceCount = (markdown.match(/```/g) ?? []).length
  if (fenceCount % 2 !== 0) {
    throw new PrettyJsonError(
      `Unbalanced code fences: found ${fenceCount} \`\`\` markers (expected even number). ` +
      `Ensure all code blocks have closing \`\`\` markers.`
    )
  }
}

export const fromExtraPretty = (markdown: string): string => {
  const result = transformJsonBlocks(markdown, (content, language) => {
    if (!hasTripleQuote(content)) {
      return content
    }
    try {
      return transformPrettyBlock(content, (parsed) => {
        const collapsed = collapseValue(parsed)
        return serializeJson(collapsed, 0, false)
      })
    } catch (e) {
      if (e instanceof PrettyJsonError) {
        throw new PrettyJsonError(`${language}: ${e.message}`)
      }
      throw e
    }
  })

  // Final safety check: if """ remains anywhere, the markdown structure is broken
  if (hasTripleQuote(result)) {
    throw new PrettyJsonError(
      `Found """ in output - likely an unclosed code block. ` +
      `Ensure all code blocks have closing \`\`\` markers.`
    )
  }

  // Validate balanced code fences
  validateBalancedFences(result)

  return result
}
