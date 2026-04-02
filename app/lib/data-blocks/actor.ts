import equal from "fast-deep-equal"
import { parseCodeBlocks, replaceBlockContents, type CodeBlock } from "./parse"
import { getActorPaths, isSingleton } from "~/lib/data-blocks/registry"
import { parsePath, tryParseJson, isObject, type ParsedPath } from "./json"

export const stampActors = (original: string, updated: string, actor: Actor): string => {
  const newBlocks = parseCodeBlocks(updated)
  const oldBlocks = parseCodeBlocks(original)

  const updates: { block: CodeBlock; newContent: string }[] = []

  for (const newBlock of newBlocks) {
    const actorPaths = getActorPaths(newBlock.language)
    if (actorPaths.length === 0) continue

    const newParsed = tryParseJson(newBlock.content)
    if (!newParsed) continue

    const oldParsed = findOldParsed(newBlock, newParsed, oldBlocks)

    let stamped = newParsed
    for (const config of actorPaths) {
      stamped = stampActorPath(oldParsed, stamped, parsePath(config.path), actor)
    }

    const newContent = JSON.stringify(stamped, null, 2)
    if (newContent !== newBlock.content) {
      updates.push({ block: newBlock, newContent })
    }
  }

  if (updates.length === 0) return updated

  return replaceBlockContents(updated, updates)
}

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
  const sameLanguage = oldBlocks.filter((b) => b.language === newBlock.language)
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
): Record<string, unknown> => {
  if (!oldParsed) return { ...newParsed, [field]: actor }

  const oldWithout = withoutField(oldParsed, field)
  const newWithout = withoutField(newParsed, field)
  const value = equal(oldWithout, newWithout) ? oldParsed[field] : actor

  return { ...newParsed, [field]: value }
}

const stampArrayItem = (
  item: Record<string, unknown>,
  oldById: Map<string, Record<string, unknown>>,
  itemField: string,
  actor: Actor
): Record<string, unknown> => {
  const oldItem = item.id ? oldById.get(item.id as string) : undefined

  if (!oldItem) return { ...item, [itemField]: actor }

  const oldWithout = withoutField(oldItem, itemField)
  const newWithout = withoutField(item, itemField)
  const value = equal(oldWithout, newWithout) ? oldItem[itemField] : actor

  return { ...item, [itemField]: value }
}

const buildOldById = (oldArr: unknown): Map<string, Record<string, unknown>> =>
  Array.isArray(oldArr)
    ? new Map(
        oldArr
          .filter(isObject)
          .filter((item) => item.id)
          .map((item) => [item.id as string, item])
      )
    : new Map<string, Record<string, unknown>>()

const stampArrayActors = (
  oldParsed: Record<string, unknown> | null,
  newParsed: Record<string, unknown>,
  arrayField: string,
  itemField: string,
  actor: Actor
): Record<string, unknown> => {
  const newArr = newParsed[arrayField]
  if (!Array.isArray(newArr)) return newParsed

  const oldById = buildOldById(oldParsed?.[arrayField])
  const stamped = newArr.map((item) =>
    isObject(item) ? stampArrayItem(item, oldById, itemField, actor) : item
  )

  return { ...newParsed, [arrayField]: stamped }
}

const stampRootArrayActors = (
  oldParsed: unknown,
  newParsed: unknown,
  itemField: string,
  actor: Actor
): unknown => {
  if (!Array.isArray(newParsed)) return newParsed

  const oldById = buildOldById(Array.isArray(oldParsed) ? oldParsed : [])

  return newParsed.map((item) =>
    isObject(item) ? stampArrayItem(item, oldById, itemField, actor) : item
  )
}

const stampActorPath = (
  oldParsed: Record<string, unknown> | null,
  newParsed: Record<string, unknown>,
  pathInfo: ParsedPath | null,
  actor: Actor
): Record<string, unknown> => {
  if (!pathInfo) return newParsed

  if (pathInfo.type === "root") {
    return stampRootActor(oldParsed, newParsed, pathInfo.field, actor)
  } else if (pathInfo.type === "root-array") {
    return stampRootArrayActors(oldParsed, newParsed, pathInfo.itemField, actor) as Record<
      string,
      unknown
    >
  } else {
    return stampArrayActors(oldParsed, newParsed, pathInfo.arrayField, pathInfo.itemField, actor)
  }
}
