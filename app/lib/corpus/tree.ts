import type { FileStore } from "~/lib/files/store"
import {
  getDocumentType,
  getDocumentSubject,
} from "~/domain/data-blocks/attributes/topics/selectors"
import { toCorpusKey } from "~/domain/corpus/types"
import { isEmbeddableFile } from "~/lib/embeddings/filter"

export interface FileClassification {
  type: string
  subject: string
}

export interface GroupedClassification {
  key: string
  count: number
}

export interface CorpusCount {
  corpus: string
  count: number
}

export const collectClassifications = (files: FileStore): FileClassification[] => {
  const results: FileClassification[] = []
  for (const [filename, content] of Object.entries(files)) {
    if (!isEmbeddableFile(filename)) continue
    const type = getDocumentType(content)
    const subject = getDocumentSubject(content)
    if (type && subject) results.push({ type, subject })
  }
  return results
}

export const groupByCorpus = (classifications: FileClassification[]): GroupedClassification[] => {
  const counts = new Map<string, number>()
  for (const { type, subject } of classifications) {
    const key = toCorpusKey(type, subject)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
}

const EXCLUDED_LABELS = new Set(["unknown", "undefined"])

export const isExcludedLabel = (label: string): boolean => EXCLUDED_LABELS.has(label.toLowerCase())

export const filterExcludedLabels = (labels: string[]): string[] =>
  labels.filter((l) => !isExcludedLabel(l))

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

export const collectSubjectCounts = (files: FileStore): Map<string, number> =>
  collectField(files, getDocumentSubject)

const SIGNIFICANCE_PCT = 5

export const selectSignificantCorpora = (
  corpora: CorpusCount[],
  threshold = SIGNIFICANCE_PCT
): string[] => {
  const total = corpora.reduce((sum, c) => sum + c.count, 0)
  if (total === 0) return []
  return corpora.filter((c) => (c.count / total) * 100 > threshold).map((c) => c.corpus)
}
