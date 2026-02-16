import equal from "fast-deep-equal"
import { parseCodeBlocks, type CodeBlock } from "./parse"
import { getActorPaths, isSingleton } from "./registry"
import { parsePath, tryParseJson, isObject, type ParsedPath } from "./json"

type Actor = "ai" | "user"

const withoutField = (obj: Record<string, unknown>, field: string): Record<string, unknown> => {
  const { [field]: _, ...rest } = obj
  return rest
}

const findOldParsed = (
  newBlock: CodeBlock,
  newParsed: Record<string, unknown>,
  oldBlocks: CodeBlock[]
): Record<string, unknown> | null => {
  const sameLanguage = oldBlocks.filter(b => b.language === newBlock.language)
  if (sameLanguage.length === 0) return null

  if (isSingleton(newBlock.language)) {
    return tryParseJson(sameLanguage[0].content)
  }

  const newId = newParsed.id as string | undefined
  if (!newId) return null

  for (const old of sameLanguage) {
    const parsed = tryParseJson(old.content)
    if (parsed?.id === newId) return parsed
  }

  return null
}

const stampRootActor = (
  oldParsed: Record<string, unknown> | null,
  newParsed: Record<string, unknown>,
  field: string,
  actor: Actor
): void => {
  if (!oldParsed) {
    newParsed[field] = actor
    return
  }

  const oldWithout = withoutField(oldParsed, field)
  const newWithout = withoutField(newParsed, field)

  newParsed[field] = equal(oldWithout, newWithout)
    ? oldParsed[field]
    : actor
}

const stampArrayActors = (
  oldParsed: Record<string, unknown> | null,
  newParsed: Record<string, unknown>,
  arrayField: string,
  itemField: string,
  actor: Actor
): void => {
  const newArr = newParsed[arrayField]
  if (!Array.isArray(newArr)) return

  const oldArr = oldParsed?.[arrayField]
  const oldById = Array.isArray(oldArr)
    ? new Map(
        oldArr
          .filter(isObject)
          .filter(item => item.id)
          .map(item => [item.id as string, item])
      )
    : new Map<string, Record<string, unknown>>()

  for (const item of newArr) {
    if (!isObject(item)) continue

    const oldItem = item.id ? oldById.get(item.id as string) : undefined

    if (!oldItem) {
      item[itemField] = actor
    } else {
      const oldWithout = withoutField(oldItem, itemField)
      const newWithout = withoutField(item, itemField)

      item[itemField] = equal(oldWithout, newWithout)
        ? oldItem[itemField]
        : actor
    }
  }
}

const stampActorPath = (
  oldParsed: Record<string, unknown> | null,
  newParsed: Record<string, unknown>,
  pathInfo: ParsedPath | null,
  actor: Actor
): void => {
  if (!pathInfo) return

  if (pathInfo.type === "root") {
    stampRootActor(oldParsed, newParsed, pathInfo.field, actor)
  } else {
    stampArrayActors(oldParsed, newParsed, pathInfo.arrayField, pathInfo.itemField, actor)
  }
}

type BlockUpdate = { block: CodeBlock; newContent: string }

const applyBlockUpdates = (markdown: string, updates: BlockUpdate[]): string => {
  let result = markdown
  let offset = 0

  for (const { block, newContent } of updates) {
    const blockStart = block.start + offset
    const blockEnd = block.end + offset
    const section = result.slice(blockStart, blockEnd)
    const replaced = section.replace(block.content, newContent)

    result = result.slice(0, blockStart) + replaced + result.slice(blockEnd)
    offset += replaced.length - section.length
  }

  return result
}

export const stampActors = (original: string, updated: string, actor: Actor): string => {
  const newBlocks = parseCodeBlocks(updated)
  const oldBlocks = parseCodeBlocks(original)

  const updates: BlockUpdate[] = []

  for (const newBlock of newBlocks) {
    const actorPaths = getActorPaths(newBlock.language)
    if (actorPaths.length === 0) continue

    const newParsed = tryParseJson(newBlock.content)
    if (!newParsed) continue

    const oldParsed = findOldParsed(newBlock, newParsed, oldBlocks)

    for (const config of actorPaths) {
      stampActorPath(oldParsed, newParsed, parsePath(config.path), actor)
    }

    const newContent = JSON.stringify(newParsed, null, 2)
    if (newContent !== newBlock.content) {
      updates.push({ block: newBlock, newContent })
    }
  }

  if (updates.length === 0) return updated

  return applyBlockUpdates(updated, updates)
}
