import { findSingletonBlock, parseBlockJson } from "~/domain/blocks/parse"
import { validateMarkdownBlocks, extractProse, type ValidationError } from "~/domain/blocks/validate"
import type { DocumentMeta, StoredAnnotation } from "./schema"
import { getAllCodes } from "~/lib/files/selectors"
import { getFiles } from "~/lib/files/store"
import stringComparison from "string-comparison"

type AnnotationInput = Omit<StoredAnnotation, "text"> & { text: string }

export type UpsertResult =
  | { ok: true; content: string; applied: StoredAnnotation[]; notFound: AnnotationInput[] }
  | { ok: false; errors: ValidationError[] }

export type RemoveResult =
  | { ok: true; content: string; removed: string[]; notFound: string[] }
  | { ok: false; errors: ValidationError[] }

const ATTRIBUTES_LANG = "json-attributes"
const SIMILARITY_THRESHOLD = 0.85

const getExistingMeta = (docContent: string): DocumentMeta => {
  const block = findSingletonBlock(docContent, ATTRIBUTES_LANG)
  if (!block) return {}
  return parseBlockJson<DocumentMeta>(block) ?? {}
}

const formatBlock = (language: string, content: string): string =>
  `\`\`\`${language}\n${content}\n\`\`\``

const { levenshtein } = stringComparison

// Find best fuzzy substring match in prose
const fuzzyMatchText = (needle: string, prose: string): string | null => {
  // First try exact match
  if (prose.includes(needle)) return needle

  // Try case-insensitive exact match
  const lowerProse = prose.toLowerCase()
  const lowerNeedle = needle.toLowerCase()
  const idx = lowerProse.indexOf(lowerNeedle)
  if (idx !== -1) {
    return prose.slice(idx, idx + needle.length)
  }

  // Fuzzy sliding window match
  const words = prose.split(/\s+/)
  const needleWords = needle.split(/\s+/)
  const windowSize = needleWords.length

  let bestMatch: string | null = null
  let bestScore = 0

  for (let i = 0; i <= words.length - windowSize; i++) {
    const window = words.slice(i, i + windowSize).join(" ")
    const score = levenshtein.similarity(window.toLowerCase(), lowerNeedle)

    if (score > bestScore && score >= SIMILARITY_THRESHOLD) {
      bestScore = score
      bestMatch = window
    }
  }

  return bestMatch
}

const buildValidationContext = (docContent: string) => ({
  documentProse: extractProse(docContent),
  availableCodes: getAllCodes(getFiles()).map((c) => ({ id: c.id, name: c.title })),
})

const applyWithBypass = (
  docContent: string,
  newMeta: DocumentMeta
): { ok: true; content: string } | { ok: false; errors: ValidationError[] } => {
  const block = findSingletonBlock(docContent, ATTRIBUTES_LANG)
  const newBlockContent = JSON.stringify(newMeta, null, 2)

  const newBlockStr = formatBlock(ATTRIBUTES_LANG, newBlockContent)
  const newContent = block
    ? docContent.slice(0, block.start) + newBlockStr + docContent.slice(block.end)
    : docContent.trimEnd() + "\n\n" + newBlockStr

  const context = buildValidationContext(newContent)
  const validation = validateMarkdownBlocks(newContent, {
    context,
    original: docContent,
    skipImmutableCheck: true,
  })

  if (!validation.valid) {
    return { ok: false, errors: validation.errors }
  }

  return { ok: true, content: newContent }
}

export const upsertAnnotations = (
  docContent: string,
  annotations: AnnotationInput[]
): UpsertResult => {
  const prose = extractProse(docContent)
  const existingMeta = getExistingMeta(docContent)
  const existingAnnotations = existingMeta.annotations ?? []

  const applied: StoredAnnotation[] = []
  const notFound: AnnotationInput[] = []

  for (const input of annotations) {
    const matchedText = fuzzyMatchText(input.text, prose)

    if (matchedText === null) {
      notFound.push(input)
      continue
    }

    const normalized: StoredAnnotation = { ...input, text: matchedText }

    // Upsert: replace if same text exists, otherwise add
    const existingIdx = existingAnnotations.findIndex((a) => a.text === matchedText)
    if (existingIdx >= 0) {
      existingAnnotations[existingIdx] = normalized
    } else {
      existingAnnotations.push(normalized)
    }

    applied.push(normalized)
  }

  if (applied.length === 0) {
    return { ok: true, content: docContent, applied: [], notFound }
  }

  const newMeta: DocumentMeta = { ...existingMeta, annotations: existingAnnotations }
  const result = applyWithBypass(docContent, newMeta)

  if (!result.ok) {
    return { ok: false, errors: result.errors }
  }

  return { ok: true, content: result.content, applied, notFound }
}

export const removeAnnotations = (
  docContent: string,
  texts: string[]
): RemoveResult => {
  const prose = extractProse(docContent)
  const existingMeta = getExistingMeta(docContent)
  const existingAnnotations = existingMeta.annotations ?? []

  const removed: string[] = []
  const notFound: string[] = []

  const textsToRemove = new Set<string>()

  for (const text of texts) {
    const matchedText = fuzzyMatchText(text, prose)
    if (matchedText === null) {
      notFound.push(text)
    } else {
      textsToRemove.add(matchedText)
      removed.push(matchedText)
    }
  }

  const filteredAnnotations = existingAnnotations.filter((a) => !textsToRemove.has(a.text))

  if (removed.length === 0) {
    return { ok: true, content: docContent, removed: [], notFound }
  }

  const newMeta: DocumentMeta = {
    ...existingMeta,
    annotations: filteredAnnotations.length > 0 ? filteredAnnotations : undefined,
  }
  const result = applyWithBypass(docContent, newMeta)

  if (!result.ok) {
    return { ok: false, errors: result.errors }
  }

  return { ok: true, content: result.content, removed, notFound }
}
