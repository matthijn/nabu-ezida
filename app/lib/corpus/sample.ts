import type { FileStore } from "~/lib/files/store"
import { isEmbeddableFile } from "~/lib/embeddings/filter"
import { companionFilename } from "~/lib/embeddings/companion"
import { parseCompanionEntries } from "~/lib/embeddings/companion"
import {
  getDocumentType,
  getDocumentSubject,
} from "~/domain/data-blocks/attributes/topics/selectors"
import { GENERAL_CORPUS, toCorpusKey } from "~/domain/corpus/types"
import type { LabelRemaps } from "./cluster"

const remapLabel = (remap: Map<string, string> | undefined, label: string): string =>
  remap?.get(label) ?? label

const matchesCorpus = (content: string, corpus: string, remaps?: LabelRemaps): boolean => {
  const type = getDocumentType(content)
  const subject = getDocumentSubject(content)
  if (!type || !subject) return false
  const mapped = toCorpusKey(remapLabel(remaps?.types, type), remapLabel(remaps?.subjects, subject))
  return mapped === corpus
}

const findAllEmbeddableFiles = (files: FileStore): string[] =>
  Object.entries(files)
    .filter(([filename]) => isEmbeddableFile(filename))
    .map(([filename]) => filename)

const findCorpusFiles = (files: FileStore, corpus: string, remaps?: LabelRemaps): string[] =>
  corpus === GENERAL_CORPUS
    ? findAllEmbeddableFiles(files)
    : Object.entries(files)
        .filter(
          ([filename, content]) =>
            isEmbeddableFile(filename) && matchesCorpus(content, corpus, remaps)
        )
        .map(([filename]) => filename)

const collectTexts = (files: FileStore, filenames: string[], language: string): string[] => {
  const texts: string[] = []
  for (const filename of filenames) {
    const companion = companionFilename(filename)
    const raw = files[companion]
    if (!raw) continue
    const entries = parseCompanionEntries(raw)
    for (const entry of entries) {
      const entryLanguage = entry.language ?? "eng"
      if (entryLanguage === language) texts.push(entry.text)
    }
  }
  return texts
}

const shuffleDeterministic = (items: string[], seed: number): string[] => {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = (seed + i) % (i + 1)
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export const sampleChunks = (
  files: FileStore,
  corpus: string,
  language: string,
  count: number,
  remaps?: LabelRemaps
): string[] => {
  const corpusFiles = findCorpusFiles(files, corpus, remaps)
  const texts = collectTexts(files, corpusFiles, language)
  if (texts.length <= count) return texts
  const shuffled = shuffleDeterministic(texts, texts.length)
  return shuffled.slice(0, count)
}
