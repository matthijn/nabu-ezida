import { getFileRaw, getStoredAnnotations } from "~/lib/files"
import { filterMatchingAnnotations } from "~/domain/attributes/annotations"
import { stripAttributesBlock } from "~/lib/text/markdown"
import { extractProse } from "~/domain/blocks"
import type { StoredAnnotation } from "~/domain/attributes"

export const readFileContent = (file: string): string =>
  stripAttributesBlock(getFileRaw(file) ?? "")

export const readFileProse = (file: string): string =>
  extractProse(readFileContent(file))

export const readFileAnnotations = (file: string): StoredAnnotation[] => {
  const raw = getFileRaw(file)
  if (!raw) return []
  const prose = extractProse(stripAttributesBlock(raw))
  return filterMatchingAnnotations(getStoredAnnotations(raw), prose)
}

export const addLineNumbers = (text: string): string =>
  text.split("\n").map((line, i) => `${i + 1}: ${line}`).join("\n")

export const sliceLines = (text: string, start: number, end: number): string =>
  text.split("\n")
    .slice(start - 1, end)
    .map((line, i) => `${start + i}: ${line}`)
    .join("\n")
