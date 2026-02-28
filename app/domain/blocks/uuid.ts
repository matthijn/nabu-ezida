import { parseCodeBlocks, type CodeBlock } from "./parse"
import { getLabelKey, getIdPaths, type IdPathConfig } from "./registry"
import { tryParseJson, isObject, parsePath } from "./json"

const UUID_PLACEHOLDER_REGEX = /\[uuid-([a-zA-Z0-9_-]+)\]/g
const TRAILING_NUMBER_REGEX = /-\d+$/
const SYSTEM_ID_SUFFIX_RE = /^[a-z0-9]{6,10}$/

export type GeneratedId = {
  id: string
  type: string
  label: string | null
  source: string  // placeholder key like "uuid-callout-1", malformed ID, or "none"
}

export type UuidMapping = Record<string, string>

let persistentIdMap: UuidMapping = {}

export const clearPersistentIds = (): void => {
  persistentIdMap = {}
}

const generateShortId = (): string => {
  const digit = Math.floor(Math.random() * 10).toString()
  const rest = Math.random().toString(36).substring(2, 9)
  return digit + rest
}

const extractPrefix = (name: string): string =>
  name.replace(TRAILING_NUMBER_REGEX, "")

const generatePrefixedId = (name: string): string =>
  `${extractPrefix(name)}_${generateShortId()}`

export const isSystemId = (id: string, prefix: string): boolean => {
  if (!id.startsWith(`${prefix}_`)) return false
  return SYSTEM_ID_SUFFIX_RE.test(id.slice(prefix.length + 1))
}

const shouldNormalizeId = (id: string, prefix: string, originalContent?: string): boolean => {
  if (isSystemId(id, prefix)) return false
  if (!originalContent) return false
  if (originalContent.includes(id)) return false
  return true
}

const resolveOrGenerateId = (malformedId: string, prefix: string): string => {
  if (malformedId in persistentIdMap) return persistentIdMap[malformedId]
  const newId = `${prefix}_${generateShortId()}`
  persistentIdMap[malformedId] = newId
  return newId
}

type ResolvedId = { newId: string; source: string }

const resolveId = (currentValue: unknown, prefix: string, originalContent?: string): ResolvedId | null => {
  if (isMissingId(currentValue)) {
    return { newId: `${prefix}_${generateShortId()}`, source: "none" }
  }
  if (typeof currentValue !== "string") return null
  if (!shouldNormalizeId(currentValue, prefix, originalContent)) return null
  return { newId: resolveOrGenerateId(currentValue, prefix), source: currentValue }
}

export const replaceUuidPlaceholders = (content: string): { result: string; generated: UuidMapping } => {
  const generated: UuidMapping = {}

  const result = content.replace(UUID_PLACEHOLDER_REGEX, (_, name) => {
    if (!(name in persistentIdMap)) {
      persistentIdMap[name] = generatePrefixedId(name)
    }
    generated[name] = persistentIdMap[name]
    return persistentIdMap[name]
  })

  return { result, generated }
}

const isMissingId = (id: unknown): boolean =>
  id === undefined || id === null || id === ""

const getBlockLabel = (parsed: Record<string, unknown>, language: string): string | null => {
  const labelKey = getLabelKey(language)
  if (!labelKey) return null
  const value = parsed[labelKey]
  if (typeof value !== "string") return null
  return value.length > 40 ? value.slice(0, 40) + "..." : value
}

export type FillIdsResult = {
  content: string
  generated: GeneratedId[]
}

type BlockUpdate = {
  block: CodeBlock
  newContent: string
  ids: GeneratedId[]
}

const fillIdPath = (
  parsed: Record<string, unknown>,
  config: IdPathConfig,
  language: string,
  originalContent?: string,
): GeneratedId[] => {
  const pathInfo = parsePath(config.path)
  if (!pathInfo) return []

  const ids: GeneratedId[] = []

  if (pathInfo.type === "root") {
    const resolved = resolveId(parsed[pathInfo.field], config.prefix, originalContent)
    if (resolved) {
      parsed[pathInfo.field] = resolved.newId
      ids.push({
        id: resolved.newId,
        type: language,
        label: getBlockLabel(parsed, language),
        source: resolved.source,
      })
    }
  } else {
    const arr = parsed[pathInfo.arrayField]
    if (!Array.isArray(arr)) return ids

    for (const item of arr) {
      if (!isObject(item)) continue
      const resolved = resolveId(item[pathInfo.itemField], config.prefix, originalContent)
      if (!resolved) continue
      item[pathInfo.itemField] = resolved.newId
      ids.push({
        id: resolved.newId,
        type: `${language}.${pathInfo.arrayField}`,
        label: null,
        source: resolved.source,
      })
    }
  }

  return ids
}

const collectBlockUpdates = (markdown: string, originalContent?: string): BlockUpdate[] => {
  const blocks = parseCodeBlocks(markdown)
  const updates: BlockUpdate[] = []

  for (const block of blocks) {
    if (!block.language.startsWith("json-")) continue

    const parsed = tryParseJson(block.content)
    if (!parsed) continue

    const idPaths = getIdPaths(block.language)
    if (idPaths.length === 0) continue

    const ids: GeneratedId[] = []
    for (const config of idPaths) {
      ids.push(...fillIdPath(parsed, config, block.language, originalContent))
    }

    if (ids.length > 0) {
      updates.push({
        block,
        newContent: JSON.stringify(parsed, null, 2),
        ids,
      })
    }
  }

  return updates
}

export const fillMissingIds = (markdown: string, originalContent?: string): FillIdsResult => {
  const updates = collectBlockUpdates(markdown, originalContent)
  if (updates.length === 0) {
    return { content: markdown, generated: [] }
  }

  let result = markdown
  let offset = 0
  const generated: GeneratedId[] = []

  for (const { block, newContent, ids } of updates) {
    const blockStart = block.start + offset
    const blockEnd = block.end + offset
    const original = result.slice(blockStart, blockEnd)
    const replaced = original.replace(block.content, newContent)

    result = result.slice(0, blockStart) + replaced + result.slice(blockEnd)
    offset += replaced.length - original.length

    generated.push(...ids)
  }

  return { content: result, generated }
}

export const buildGeneratedIdsList = (
  placeholderMapping: UuidMapping,
  autoGenerated: GeneratedId[],
  markdown: string
): GeneratedId[] => {
  const result: GeneratedId[] = []

  // Add placeholder-resolved IDs with context from the final markdown
  const blocks = parseCodeBlocks(markdown)
  for (const [placeholder, id] of Object.entries(placeholderMapping)) {
    const block = blocks.find((b) => {
      const parsed = tryParseJson(b.content)
      return parsed?.id === id
    })

    if (block) {
      const parsed = tryParseJson(block.content)
      result.push({
        id,
        type: block.language,
        label: parsed ? getBlockLabel(parsed, block.language) : null,
        source: placeholder,
      })
    } else {
      result.push({ id, type: "unknown", label: null, source: placeholder })
    }
  }

  // Add auto-generated IDs
  result.push(...autoGenerated)

  return result
}

export const formatGeneratedIds = (ids: GeneratedId[]): string => {
  if (ids.length === 0) return ""

  const lines = ids.map((g) => {
    const labelPart = g.label ? ` "${g.label}"` : ""
    const sourcePart = g.source === "none" ? "[none]" : `[${g.source}]`
    return `- ${g.id} for ${g.type} ${sourcePart}${labelPart}`
  })

  return `Generated IDs:\n${lines.join("\n")}`
}

export const hasUuidPlaceholders = (content: string): boolean =>
  UUID_PLACEHOLDER_REGEX.test(content)
