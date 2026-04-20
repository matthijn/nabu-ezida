import type { FileStore } from "~/lib/files/store"
import { SETTINGS_FILE } from "~/lib/files/filename"
import { getSettings } from "~/domain/data-blocks/settings/selectors"
import { fnvHash } from "~/lib/utils/hash"
import type { CorpusDescription } from "./types"

export const getCorpusDescriptions = (files: FileStore): CorpusDescription[] =>
  getSettings(files[SETTINGS_FILE] ?? "")?.corpusDescriptions ?? []

export const getDescriptionsHash = (descriptions: CorpusDescription[]): string => {
  const sorted = [...descriptions].sort((a, b) => {
    const keyA = `${a.language}:${a.corpus}`
    const keyB = `${b.language}:${b.corpus}`
    return keyA < keyB ? -1 : keyA > keyB ? 1 : 0
  })
  const joined = sorted.map((d) => `${d.language}:${d.corpus}:${d.hash}`).join("|")
  return fnvHash(joined)
}

export const findDescription = (
  descriptions: CorpusDescription[],
  language: string,
  corpus: string
): CorpusDescription | undefined =>
  descriptions.find((d) => d.language === language && d.corpus === corpus)
