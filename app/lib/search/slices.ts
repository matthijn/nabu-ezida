import type { SearchHit } from "~/domain/search"
import type { Annotation } from "~/domain/data-blocks/attributes/schema"
import { DocumentMeta } from "~/domain/data-blocks/attributes/schema"
import { AnnotationsBlockSchema } from "~/domain/data-blocks/annotations/schema"
import { findSingletonBlock } from "~/lib/data-blocks/parse"
import { getBlock } from "~/lib/data-blocks/query"
import { stripAttributesBlock } from "~/lib/markdown/strip-attributes"

interface Range {
  start: number
  end: number
}

interface ExpandedSlice {
  text: string
  annotations: Annotation[]
}

const stripMarks = (text: string): string => text.replace(/<\/?mark>/g, "")

const findRange = (haystack: string, needle: string): Range | null => {
  const idx = haystack.indexOf(needle)
  if (idx === -1) return null
  return { start: idx, end: idx + needle.length }
}

const rangesOverlap = (a: Range, b: Range): boolean => a.start < b.end && b.start < a.end

const boundingRange = (base: Range, extras: Range[]): Range => {
  let start = base.start
  let end = base.end
  for (const r of extras) {
    if (r.start < start) start = r.start
    if (r.end > end) end = r.end
  }
  return { start, end }
}

const parseTags = (fileContent: string): string[] | undefined => {
  const block = findSingletonBlock(fileContent, "json-attributes")
  if (!block) return undefined
  try {
    const parsed = DocumentMeta.safeParse(JSON.parse(block.content))
    return parsed.success ? parsed.data.tags : undefined
  } catch {
    return undefined
  }
}

const parseAnnotations = (fileContent: string): Annotation[] =>
  getBlock(fileContent, "json-annotations", AnnotationsBlockSchema) ?? []

const formatAnnotationsBlock = (meta: { tags?: string[]; annotations: Annotation[] }): string => {
  const obj: Record<string, unknown> = {}
  if (meta.tags) obj.tags = meta.tags
  if (meta.annotations.length > 0) obj.annotations = meta.annotations
  return "```json-attributes\n" + JSON.stringify(obj) + "\n```"
}

const expandSliceWithAnnotations = (
  sliceText: string,
  prose: string,
  annotations: Annotation[]
): ExpandedSlice => {
  const cleanSlice = stripMarks(sliceText)
  const sliceRange = findRange(prose, cleanSlice)
  if (!sliceRange) return { text: sliceText, annotations: [] }
  if (annotations.length === 0) return { text: sliceText, annotations: [] }

  const overlapping: { annotation: Annotation; range: Range }[] = []
  for (const ann of annotations) {
    const annRange = findRange(prose, ann.text)
    if (!annRange) continue
    if (rangesOverlap(sliceRange, annRange)) {
      overlapping.push({ annotation: ann, range: annRange })
    }
  }

  if (overlapping.length === 0) return { text: sliceText, annotations: [] }

  const expanded = boundingRange(
    sliceRange,
    overlapping.map((o) => o.range)
  )
  return {
    text: prose.slice(expanded.start, expanded.end),
    annotations: overlapping.map((o) => o.annotation),
  }
}

export const extractSearchSlice = (hit: SearchHit, fileContent: string): string | null => {
  if (!hit.text) return null
  if (!fileContent) return hit.text

  const annotations = parseAnnotations(fileContent)
  if (annotations.length === 0) return hit.text

  const prose = stripAttributesBlock(fileContent)
  const tags = parseTags(fileContent)
  const { text, annotations: overlapping } = expandSliceWithAnnotations(
    hit.text,
    prose,
    annotations
  )
  if (overlapping.length === 0) return text

  const block = formatAnnotationsBlock({ tags, annotations: overlapping })
  return `${text}\n\n${block}`
}
