import type { z } from "zod"
import type { DocumentMeta, StoredAnnotation } from "~/domain/blocks/attributes/schema"
import type { Annotation } from "~/domain/document/annotations"
import type { Settings, TagDefinition } from "~/domain/blocks/settings/schema"
import type { RadixColor } from "~/lib/colors/radix"
import { blockTypes } from "~/domain/blocks/registry"
import { findSingletonBlock, findBlocksByLanguage } from "~/lib/blocks/parse"
import type { CalloutBlock } from "~/domain/blocks/callout/schema"
import { createCappedCache } from "~/lib/utils"
import { SETTINGS_FILE, toDisplayName } from "./filename"

type BlockTypeMap = {
  "json-attributes": DocumentMeta
  "json-settings": Settings
  "json-callout": CalloutBlock
}

type BlockLanguage = keyof BlockTypeMap

type Code = { id: string; name: string; color: string; detail: string }
type CodeGroup = { fileId: string; name: string; codes: Code[] }
export type Codebook = { categories: CodeGroup[] }

const cache = createCappedCache<string, unknown>(100)

const cacheKey = (language: string, content: string): string =>
  `${language}:${content}`

const parseWithCache = <T>(language: string, content: string, schema: z.ZodType<T>): T | null => {
  const key = cacheKey(language, content)

  if (cache.has(key)) return cache.get(key) as T | null

  try {
    const json = JSON.parse(content)
    const result = schema.safeParse(json)
    const parsed = result.success ? result.data : null
    cache.set(key, parsed)
    return parsed
  } catch {
    cache.set(key, null)
    return null
  }
}

export const getBlock = <K extends BlockLanguage>(raw: string, language: K): BlockTypeMap[K] | null => {
  const config = blockTypes[language]
  if (!config) return null

  const block = findSingletonBlock(raw, language)
  if (!block) return null

  return parseWithCache(language, block.content, config.schema) as BlockTypeMap[K]
}

export const getBlocks = <K extends BlockLanguage>(raw: string, language: K): BlockTypeMap[K][] => {
  const config = blockTypes[language]
  if (!config) return []

  return findBlocksByLanguage(raw, language)
    .map((block) => parseWithCache(language, block.content, config.schema) as BlockTypeMap[K] | null)
    .filter((b): b is BlockTypeMap[K] => b !== null)
}

export const getAttributes = (raw: string): DocumentMeta | null =>
  getBlock(raw, "json-attributes")

export const getTags = (raw: string): string[] =>
  getAttributes(raw)?.tags ?? []

export const getStoredAnnotations = (raw: string): StoredAnnotation[] =>
  getAttributes(raw)?.annotations ?? []

export const getAnnotationCount = (raw: string): number =>
  getStoredAnnotations(raw).length

export const getCallouts = (raw: string): CalloutBlock[] =>
  getBlocks(raw, "json-callout")

export const getCodes = (raw: string): CalloutBlock[] =>
  getCallouts(raw).filter((c) => c.type === "codebook-code")

export const getAllCodes = (files: Record<string, string>): CalloutBlock[] =>
  Object.values(files).flatMap(getCodes)

export const getCodebookFiles = (files: Record<string, string>): string[] =>
  Object.entries(files)
    .filter(([_, raw]) => getCodes(raw).length > 0)
    .map(([name]) => name)

const findCodeById = (files: Record<string, string>, id: string): CalloutBlock | undefined =>
  getAllCodes(files).find((c) => c.id === id)

export const getCodeTitle = (files: Record<string, string>, id: string): string | undefined =>
  findCodeById(files, id)?.title

export const getCodeMapping = (files: Record<string, string>): Record<string, string> =>
  Object.fromEntries(getAllCodes(files).map((c) => [c.id, c.title]))

const calloutToCode = (callout: CalloutBlock): Code => ({
  id: callout.id,
  name: callout.title,
  color: callout.color,
  detail: callout.content,
})

const groupCodesByFile = (files: Record<string, string>): CodeGroup[] =>
  Object.entries(files).reduce<CodeGroup[]>((acc, [filename, raw]) => {
    const codes = getCodes(raw).map(calloutToCode)
    if (codes.length > 0) acc.push({ fileId: filename, name: toDisplayName(filename), codes })
    return acc
  }, [])

export const getCodebook = (files: Record<string, string>): Codebook | undefined => {
  const categories = groupCodesByFile(files)
  return categories.length === 0 ? undefined : { categories }
}

const DEFAULT_ANNOTATION_COLOR = "gray"

export const resolveAnnotationColor = (files: Record<string, string>, annotation: StoredAnnotation): string => {
  if (annotation.color) return annotation.color
  if (annotation.code) return findCodeById(files, annotation.code)?.color ?? DEFAULT_ANNOTATION_COLOR
  return DEFAULT_ANNOTATION_COLOR
}

const toAnnotation = (files: Record<string, string>, stored: StoredAnnotation): Annotation => ({
  id: stored.id,
  text: stored.text,
  color: resolveAnnotationColor(files, stored),
  reason: stored.reason,
  code: stored.code,
  review: stored.review,
})

export const getAnnotations = (files: Record<string, string>, raw: string): Annotation[] =>
  getStoredAnnotations(raw).map((a) => toAnnotation(files, a))

export const findAnnotationById = (files: Record<string, string>, id: string): StoredAnnotation | undefined =>
  Object.values(files).flatMap(getStoredAnnotations).find((a) => a.id === id)

export const findCalloutById = (files: Record<string, string>, id: string): CalloutBlock | undefined =>
  Object.values(files).flatMap(getCallouts).find((c) => c.id === id)

export const findDocumentForAnnotation = (files: Record<string, string>, id: string): string | undefined =>
  Object.entries(files).find(([_, raw]) => getStoredAnnotations(raw).some((a) => a.id === id))?.[0]

export const findDocumentForCallout = (files: Record<string, string>, id: string): string | undefined =>
  Object.entries(files).find(([_, raw]) => getCallouts(raw).some((c) => c.id === id))?.[0]

export const getSettings = (raw: string): Settings | null =>
  getBlock(raw, "json-settings")

export const getTagDefinitions = (files: Record<string, string>): TagDefinition[] =>
  getSettings(files[SETTINGS_FILE] ?? "")?.tags ?? []

export const findTagDefinitionById = (files: Record<string, string>, id: string): TagDefinition | undefined =>
  getTagDefinitions(files).find((t) => t.id === id)

export const findTagDefinitionByLabel = (files: Record<string, string>, label: string): TagDefinition | undefined =>
  getTagDefinitions(files).find((t) => t.label === label)

export const getTagColorMap = (files: Record<string, string>): Record<string, RadixColor> =>
  Object.fromEntries(getTagDefinitions(files).map((t) => [t.id, t.color]))

export const resolveEntityName = (files: Record<string, string>, id: string): string | null =>
  id.startsWith("annotation-") ? findAnnotationById(files, id)?.text ?? null
  : id.startsWith("callout-") ? findCalloutById(files, id)?.title ?? null
  : id.startsWith("tag-") ? findTagDefinitionById(files, id)?.display ?? null
  : id.endsWith(".md") && id.toLowerCase() in files ? toDisplayName(id.toLowerCase())
  : null
