import type { FileStore } from "~/lib/files/store"
import { isEmbeddableFile } from "~/lib/embeddings/filter"
import { toEmbeddableText } from "~/lib/embeddings/text"
import { getAttributes } from "~/domain/data-blocks/attributes/selectors"
import { replaceSingletonBlock } from "~/lib/data-blocks/parse"
import { debounce } from "~/lib/utils/debounce"
import { detectLanguage } from "./detect"

type ToProseFn = (block: unknown) => string | null

export interface LanguageSyncDeps {
  getFiles: () => FileStore
  updateFile: (f: string, content: string) => void
  subscribe: (listener: () => void) => () => void
  toProseFns: Record<string, ToProseFn>
}

const LANGUAGE_SYNC_DEBOUNCE = 2000

const currentLanguage = (raw: string): string | undefined =>
  getAttributes(raw)?.language ?? undefined

const buildUpdatedAttributes = (raw: string, language: string): string => {
  const attrs = getAttributes(raw)
  const updated = attrs ? { ...attrs, language } : { language }
  return JSON.stringify(updated, null, 2)
}

export const processFile = (
  raw: string,
  toProseFns: Record<string, ToProseFn>
): string | undefined => {
  const prose = toEmbeddableText(raw, toProseFns)
  const detected = detectLanguage(prose)
  if (!detected) return undefined

  const stored = currentLanguage(raw)
  if (stored === detected) return undefined

  const updatedJson = buildUpdatedAttributes(raw, detected)
  return replaceSingletonBlock(raw, "json-attributes", updatedJson)
}

export const startLanguageSync = (deps: LanguageSyncDeps): (() => void) => {
  const run = (): void => {
    const files = deps.getFiles()

    for (const [filename, raw] of Object.entries(files)) {
      if (!isEmbeddableFile(filename)) continue

      const updated = processFile(raw, deps.toProseFns)
      if (updated) deps.updateFile(filename, updated)
    }
  }

  const debouncedRun = debounce(run, LANGUAGE_SYNC_DEBOUNCE)

  return deps.subscribe(debouncedRun)
}
