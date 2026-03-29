import type { FileStore } from "~/lib/files/store"
import {
  getDocumentType,
  getDocumentSource,
  getDocumentSubject,
} from "~/domain/data-blocks/attributes/topics/selectors"
import { isEmbeddableFile } from "~/lib/embeddings/filter"

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

interface FileClassification {
  type: string
  source: string
  subject: string
}

const collectClassifications = (files: FileStore): FileClassification[] => {
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

interface GroupedSubjects {
  key: string
  count: number
  subjects: Map<string, number>
}

const groupBySourceAndType = (classifications: FileClassification[]): GroupedSubjects[] => {
  const groups = new Map<string, { count: number; subjects: Map<string, number> }>()
  for (const { type, source, subject } of classifications) {
    const key = `${source} · ${type}`
    const group = groups.get(key) ?? { count: 0, subjects: new Map() }
    group.count++
    group.subjects.set(subject, (group.subjects.get(subject) ?? 0) + 1)
    groups.set(key, group)
  }
  return [...groups.entries()]
    .map(([key, { count, subjects }]) => ({ key, count, subjects }))
    .sort((a, b) => b.count - a.count)
}

const formatGroup = ({ key, count, subjects }: GroupedSubjects): string[] => {
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
