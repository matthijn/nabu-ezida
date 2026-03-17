import type { z } from "zod"
import { findSingletonBlock, findBlocksByLanguage } from "~/lib/blocks/parse"
import { createCappedCache } from "~/lib/utils"

const cache = createCappedCache<string, unknown>(100)

const cacheKey = (language: string, content: string): string => `${language}:${content}`

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

export const getBlock = <T>(raw: string, language: string, schema: z.ZodType<T>): T | null => {
  const block = findSingletonBlock(raw, language)
  if (!block) return null
  return parseWithCache(language, block.content, schema)
}

export const getBlocks = <T>(raw: string, language: string, schema: z.ZodType<T>): T[] =>
  findBlocksByLanguage(raw, language)
    .map((block) => parseWithCache(language, block.content, schema))
    .filter((b): b is T => b !== null)
