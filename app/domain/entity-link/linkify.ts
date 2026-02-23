type NameResolver = (id: string) => string | null

const ENTITY_ID_PATTERN = /\[[^\]]*\]\([^)]+\)|((?:annotation|callout)_\d[a-z0-9]{7}|[\w][\w-]*\.md)/g
const WRAPPERS = new Set(["(", ")", "`", "*", "_"])
const QUOTES = new Set(['"', "'"])
const FILE_PROTOCOL = "file://"
const MAX_GLUE = 8

const isQuoted = (text: string, start: number, end: number): boolean =>
  start > 0 && QUOTES.has(text[start - 1]) && text[end] === text[start - 1]

const isPartOfFileUrl = (text: string, start: number): boolean =>
  start >= FILE_PROTOCOL.length && text.slice(start - FILE_PROTOCOL.length, start) === FILE_PROTOCOL

const expandWrappers = (text: string, start: number, end: number, floor: number): [number, number] => {
  while (start > floor && WRAPPERS.has(text[start - 1])) start--
  while (end < text.length && WRAPPERS.has(text[end])) end++
  return [start, end]
}

const tryStripAfter = (text: string, offset: number, name: string): number => {
  for (let gap = 1; gap <= MAX_GLUE && offset + gap < text.length; gap++) {
    if (text[offset + gap - 1] === "\n") break
    if (text.slice(offset + gap, offset + gap + name.length) !== name) continue
    const afterName = offset + gap + name.length
    if (afterName < text.length && /\w/.test(text[afterName])) continue
    let end = afterName
    while (end < text.length && WRAPPERS.has(text[end])) end++
    return end - offset
  }
  return 0
}

const tryStripBefore = (before: string, name: string): number => {
  for (let gap = 1; gap <= MAX_GLUE && gap < before.length; gap++) {
    if (before[before.length - gap] === "\n") break
    const nameStart = before.length - gap - name.length
    if (nameStart < 0) continue
    if (before.slice(nameStart, nameStart + name.length) !== name) continue
    if (nameStart > 0 && /\w/.test(before[nameStart - 1])) continue
    let start = nameStart
    while (start > 0 && WRAPPERS.has(before[start - 1])) start--
    return before.length - start
  }
  return 0
}

export const linkifyEntityIds = (text: string, resolveName: NameResolver): string => {
  const pattern = new RegExp(ENTITY_ID_PATTERN.source, "g")
  let result = ""
  let lastIndex = 0

  while (true) {
    pattern.lastIndex = lastIndex
    const match = pattern.exec(text)
    if (!match) break

    const bareId = match[1]
    if (!bareId) {
      result += text.slice(lastIndex, match.index + match[0].length)
      lastIndex = match.index + match[0].length
      continue
    }

    const name = resolveName(bareId)
    if (!name) {
      result += text.slice(lastIndex, match.index + match[0].length)
      lastIndex = match.index + match[0].length
      continue
    }

    const [consumeStart, consumeEnd] = expandWrappers(text, match.index, match.index + match[0].length, lastIndex)

    if (isQuoted(text, consumeStart, consumeEnd) || isPartOfFileUrl(text, match.index)) {
      result += text.slice(lastIndex, match.index + match[0].length)
      lastIndex = match.index + match[0].length
      continue
    }

    const link = `[${name}](file://${bareId})`

    const stripAfter = tryStripAfter(text, consumeEnd, name)
    if (stripAfter > 0) {
      result += text.slice(lastIndex, consumeStart) + link
      lastIndex = consumeEnd + stripAfter
      continue
    }

    const before = text.slice(lastIndex, consumeStart)
    const stripBefore = tryStripBefore(before, name)
    if (stripBefore > 0) {
      result += before.slice(0, -stripBefore) + link
      lastIndex = consumeEnd
      continue
    }

    result += text.slice(lastIndex, consumeStart) + link
    lastIndex = consumeEnd
  }

  result += text.slice(lastIndex)
  return result
}
