import type { z } from "zod"
import type { DocumentMeta, StoredAnnotation } from "~/domain/attributes"
import type { Annotation } from "~/domain/document/annotations"
import { blockTypes } from "~/domain/blocks/registry"
import { findSingletonBlock, findBlocksByLanguage, type CalloutBlock } from "~/domain/blocks"

type BlockTypeMap = {
  "json-attributes": DocumentMeta
  "json-callout": CalloutBlock
}

type BlockLanguage = keyof BlockTypeMap

type Code = { id: string; name: string; color: string; detail: string }
export type Codebook = { categories: { name: string; codes: Code[] }[] }

const cache = new Map<string, unknown>()

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

const calloutToCode = (callout: CalloutBlock): Code => ({
  id: callout.id,
  name: callout.title,
  color: callout.color,
  detail: callout.content,
})

export const getCodebook = (files: Record<string, string>): Codebook | undefined => {
  const codes = getAllCodes(files).map(calloutToCode)
  return codes.length === 0 ? undefined : { categories: [{ name: "Codes", codes }] }
}

const DEFAULT_ANNOTATION_COLOR = "gray"

const resolveAnnotationColor = (files: Record<string, string>, annotation: StoredAnnotation): string => {
  if (annotation.color) return annotation.color
  if (annotation.code) return findCodeById(files, annotation.code)?.color ?? DEFAULT_ANNOTATION_COLOR
  return DEFAULT_ANNOTATION_COLOR
}

const toAnnotation = (files: Record<string, string>, stored: StoredAnnotation): Annotation => ({
  text: stored.text,
  color: resolveAnnotationColor(files, stored),
  reason: stored.reason,
  code: stored.code,
})

export const getAnnotations = (files: Record<string, string>, raw: string): Annotation[] =>
  getStoredAnnotations(raw).map((a) => toAnnotation(files, a))
