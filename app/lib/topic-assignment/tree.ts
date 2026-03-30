import type { FileStore } from "~/lib/files/store"
import {
  getDocumentType,
  getDocumentSource,
  getDocumentSubject,
} from "~/domain/data-blocks/attributes/topics/selectors"
import { isEmbeddableFile } from "~/lib/embeddings/filter"

export interface FileClassification {
  type: string
  source: string
  subject: string
}

export interface GroupedClassification {
  key: string
  count: number
  subjects: Map<string, number>
}

export const collectClassifications = (files: FileStore): FileClassification[] => {
  const results: FileClassification[] = []
  for (const [filename, content] of Object.entries(files)) {
    if (!isEmbeddableFile(filename)) continue
    const type = getDocumentType(content)
    const source = getDocumentSource(content)
    const subject = getDocumentSubject(content)
    if (type && source && subject) results.push({ type, source, subject })
  }
  return results
}

export const groupBySourceAndType = (
  classifications: FileClassification[]
): GroupedClassification[] => {
  const groups = new Map<string, { count: number; subjects: Map<string, number> }>()
  for (const { type, source, subject } of classifications) {
    const key = `${source}:${type}`
    const group = groups.get(key) ?? { count: 0, subjects: new Map() }
    group.count++
    group.subjects.set(subject, (group.subjects.get(subject) ?? 0) + 1)
    groups.set(key, group)
  }
  return [...groups.entries()]
    .map(([key, { count, subjects }]) => ({ key, count, subjects }))
    .sort((a, b) => b.count - a.count)
}

const formatTreeGroup = ({ key, subjects }: GroupedClassification): string => {
  const sorted = [...subjects.keys()].sort()
  return [key, ...sorted.map((s) => `  ${s}`)].join("\n")
}

export const buildClassificationTree = (files: FileStore): string | null => {
  const classifications = collectClassifications(files)
  if (classifications.length === 0) return null
  const groups = groupBySourceAndType(classifications)
  return groups.map(formatTreeGroup).join("\n")
}
