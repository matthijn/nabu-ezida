import type { SearchHit } from "~/domain/search"
import type {
  Annotation,
  DocumentMeta as DocumentMetaType,
} from "~/domain/data-blocks/attributes/schema"
import { findSingletonBlock } from "~/lib/data-blocks/parse"
import { stripAttributesBlock } from "~/lib/markdown/strip-attributes"
import { DocumentMeta } from "~/domain/data-blocks/attributes/schema"

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

const parseDocumentMeta = (fileContent: string): DocumentMetaType | null => {
  const block = findSingletonBlock(fileContent, "json-attributes")
  if (!block) return null
  try {
    const parsed = DocumentMeta.safeParse(JSON.parse(block.content))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

const formatAttributesBlock = (meta: { tags?: string[]; annotations: Annotation[] }): string => {
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

  const meta = parseDocumentMeta(fileContent)
  if (!meta?.annotations?.length) return hit.text

  const prose = stripAttributesBlock(fileContent)
  const { text, annotations } = expandSliceWithAnnotations(hit.text, prose, meta.annotations)
  if (annotations.length === 0) return text

  const block = formatAttributesBlock({ tags: meta.tags, annotations })
  return `${text}\n\n${block}`
}
