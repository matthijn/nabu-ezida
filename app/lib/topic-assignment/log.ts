import type { FileStore } from "~/lib/files/store"
import {
  getDocumentType,
  getDocumentSource,
  getDocumentSubject,
} from "~/domain/data-blocks/attributes/topics/selectors"
import { isEmbeddableFile } from "~/lib/embeddings/filter"
import { collectClassifications, groupBySourceAndType, type GroupedClassification } from "./tree"

const collectField = (
  files: FileStore,
  getter: (content: string) => string | undefined
): Map<string, number> => {
  const counts = new Map<string, number>()
  for (const [filename, content] of Object.entries(files)) {
    if (!isEmbeddableFile(filename)) continue
    const value = getter(content)
    if (value) counts.set(value, (counts.get(value) ?? 0) + 1)
  }
  return counts
}

export const collectTypeCounts = (files: FileStore): Map<string, number> =>
  collectField(files, getDocumentType)

export const collectSourceCounts = (files: FileStore): Map<string, number> =>
  collectField(files, getDocumentSource)

export const collectSubjectCounts = (files: FileStore): Map<string, number> =>
  collectField(files, getDocumentSubject)

const formatGroup = ({ key, count, subjects }: GroupedClassification): string[] => {
  const sorted = [...subjects.entries()].sort((a, b) => b[1] - a[1])
  return [`[classify] ${key} (${count})`, ...sorted.map(([s, n]) => `[classify]   ${s} (${n})`)]
}

export const formatClassificationLog = (files: FileStore): string | null => {
  const classifications = collectClassifications(files)
  if (classifications.length === 0) return null
  const groups = groupBySourceAndType(classifications)
  return [
    `[classify] ${classifications.length} files classified`,
    `[classify] ${"─".repeat(35)}`,
    ...groups.flatMap(formatGroup),
  ].join("\n")
}
